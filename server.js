import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BRAVOPAY_API_KEY = process.env.BRAVOPAY_API_KEY;
const BRAVOPAY_BASE_URL = "https://bravopay.club/api/v1";
const PAID_ORDERS_FILE = path.join(__dirname, "data", "paid-orders.json");

if (!BRAVOPAY_API_KEY) {
  console.error("ERRO: defina BRAVOPAY_API_KEY no arquivo .env");
  process.exit(1);
}

/** Mapa em memória: transaction_id → dados do webhook (confirmação server-side) */
const paidOrders = new Map();

function ensureDataDir() {
  const dir = path.dirname(PAID_ORDERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadPaidOrders() {
  ensureDataDir();
  if (!fs.existsSync(PAID_ORDERS_FILE)) return;
  try {
    const rows = JSON.parse(fs.readFileSync(PAID_ORDERS_FILE, "utf8"));
    rows.forEach((row) => paidOrders.set(row.transaction_id, row));
  } catch (err) {
    console.warn("Não foi possível carregar paid-orders.json:", err.message);
  }
}

function persistPaidOrder(record) {
  ensureDataDir();
  paidOrders.set(record.transaction_id, record);
  fs.writeFileSync(PAID_ORDERS_FILE, JSON.stringify([...paidOrders.values()], null, 2));
}

loadPaidOrders();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, ".")));

/** Página de obrigado na rota limpa /obrigado */
app.get("/obrigado", (_req, res) => {
  res.sendFile(path.join(__dirname, "obrigado.html"));
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "bravopay-checkout" });
});

function bravopayHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${BRAVOPAY_API_KEY}`,
  };
}

/**
 * POST /api/create-transaction
 * Proxy seguro: a API key fica só no servidor, nunca no front-end.
 */
app.post("/api/create-transaction", async (req, res) => {
  try {
    const body = req.body;

    if (
      !body?.amount_cents ||
      !body?.customer?.name ||
      !body?.customer?.email ||
      !body?.customer?.phone ||
      !body?.customer?.cpf
    ) {
      return res.status(400).json({
        error: "Dados incompletos. Informe amount_cents e customer (name, email, phone, cpf).",
      });
    }

    const payload = {
      amount_cents: Math.round(Number(body.amount_cents)),
      method: body.method || "pix",
      customer: {
        name: String(body.customer.name).trim(),
        email: String(body.customer.email).trim(),
        phone: String(body.customer.phone).replace(/\D/g, ""),
        cpf: String(body.customer.cpf).replace(/\D/g, ""),
      },
      external_reference: body.external_reference || `pedido_${Date.now()}`,
    };

    if (body.product_id) payload.product_id = body.product_id;
    if (body.split) payload.split = body.split;
    if (body.utm && typeof body.utm === "object") payload.utm = body.utm;

    const response = await fetch(`${BRAVOPAY_BASE_URL}/transactions`, {
      method: "POST",
      headers: bravopayHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[BravoPay create-transaction]", response.status, data);
      return res.status(response.status).json({
        error: data?.message || data?.error || "Erro ao criar transação BravoPay.",
        details: data,
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("create-transaction:", error);
    return res.status(500).json({ error: "Erro interno ao criar transação." });
  }
});

/**
 * GET /api/transactions/:id
 * Consulta status da transação (usado pelo polling do front a cada 3s).
 */
app.get("/api/transactions/:id", async (req, res) => {
  try {
    const transactionId = req.params.id;
    if (!transactionId) {
      return res.status(400).json({ error: "ID da transação é obrigatório." });
    }

    // Se o webhook já confirmou, devolve PAID imediatamente
    const cached = paidOrders.get(transactionId);
    if (cached?.status === "PAID") {
      return res.json({
        id: transactionId,
        object: "transaction",
        status: "PAID",
        paid_at: cached.paid_at,
        webhook_confirmed: true,
      });
    }

    const response = await fetch(
      `${BRAVOPAY_BASE_URL}/transactions/${encodeURIComponent(transactionId)}`,
      { method: "GET", headers: { Authorization: `Bearer ${BRAVOPAY_API_KEY}` } }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.message || "Erro ao consultar transação.",
        details: data,
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("transaction status:", error);
    return res.status(500).json({ error: "Erro interno ao consultar status." });
  }
});

/**
 * POST /api/webhook
 * Cadastre esta URL em https://bravopay.club/dashboard/integracoes/webhooks
 *
 * Eventos: transaction.created | transaction.paid | transaction.refunded | transaction.chargeback
 *
 * Em produção: substitua persistPaidOrder() por gravação no seu banco (PostgreSQL, etc.)
 * e dispare e-mail/SMS/liberação de produto aqui — NÃO confie só no polling do cliente.
 */
app.post("/api/webhook", (req, res) => {
  const { event, transaction } = req.body || {};

  console.log("[Webhook BravoPay]", event, transaction?.id || "(sem id)");

  if (event === "transaction.paid" && transaction?.id) {
    persistPaidOrder({
      transaction_id: transaction.id,
      external_reference: transaction.external_reference || null,
      amount_cents: transaction.amount_cents,
      status: "PAID",
      paid_at: transaction.paid_at || new Date().toISOString(),
      received_at: new Date().toISOString(),
    });

    // TODO produção: atualizar pedido no banco, enviar e-mail, liberar acesso, etc.
  }

  if (event === "transaction.refunded" || event === "transaction.chargeback") {
    console.warn("[Webhook BravoPay] Estorno/chargeback:", transaction?.id);
    // TODO produção: reverter entrega / notificar suporte
  }

  res.status(200).json({ received: true });
});

app.listen(PORT, () => {
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log("Checkout:  http://localhost:${PORT}/checkout.html");
  console.log("Webhook:   http://localhost:${PORT}/api/webhook");
});
