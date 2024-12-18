import { Elysia, t } from "elysia";
import { Packr } from "msgpackr";
import { ClienteSuap } from "suap-sdk";

const app = new Elysia({ prefix: "/api" })
  .decorate("msgpack", new Packr({ moreTypes: true }))
  // @ts-ignore
  .onParse(async ({ request, msgpack }, contentType) => {
    if (contentType === "application/x-msgpack") {
      return msgpack.unpack(Buffer.from(await request.arrayBuffer()));
    }
  })
  // @ts-ignore
  .mapResponse(({ response, set, msgpack }) => {
    if (response && typeof response === "object") {
      set.headers["content-type"] = "application/x-msgpack";
      set.headers["content-encoding"] = "gzip";
      // @ts-ignore
      return Bun.gzipSync(msgpack.pack(response), { level: 9 });
    }

    set.headers["content-type"] = "text/plain; charset=utf-8";

    return response;
  })
  // @ts-ignore
  .post("/notas", async ({ body: { matricula, senha, anoLetivo } }) => {
    const suap = new ClienteSuap({ usarApenasApi: true });
    await suap.login(matricula, senha);

    return suap.obterNotas(anoLetivo, 1)
  }, {
    body: t.Object({
      matricula: t.String(),
      senha: t.String(),
      anoLetivo: t.Number(),
    })
  })
  .listen(3000);

export type App = typeof app;
