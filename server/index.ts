import "dotenv/config";
import { app } from "./app";

const port = Number(process.env.SERVER_PORT ?? 3333);

app.listen(port, () => {
  console.log(`Naniwa auth server rodando em http://localhost:${port}`);
});