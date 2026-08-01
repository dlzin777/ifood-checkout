const response = await fetch('http://localhost:3000/api/create-transaction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount_cents: 100,
    method: 'pix',
    customer: {
      name: 'Teste',
      email: 'teste@example.com',
      phone: '5511999999999',
      cpf: '12345678900'
    },
    external_reference: 'teste_1'
  })
});

console.log('STATUS', response.status);
try {
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
} catch (e) {
  const text = await response.text();
  console.log(text);
}
