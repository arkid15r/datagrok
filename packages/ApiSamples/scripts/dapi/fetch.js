// Proxy a request via Datagrok's server with the same interface as "fetch"

const url = 'https://jsonplaceholder.typicode.com/posts';
const data = { name: 'username', password: 'password' };

// GET
grok.dapi.fetchProxy(url)
  .then(response => response.text())
  .then(data => {
    const df = DG.DataFrame.fromJson(data);
    grok.shell.addTableView(df);
});

// POST
grok.dapi.fetchProxy(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
}).then(response => grok.shell.info(response.ok));
