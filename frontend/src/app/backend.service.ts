import { Packr } from "msgpackr";
import { Injectable } from '@angular/core';
import { treaty, type Treaty } from '@elysiajs/eden'
import type { App } from 'backend/src'

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  // @ts-ignore
  app: Treaty.Create<App>

  constructor() {
    const packr = new Packr({ moreTypes: true });

    // @ts-ignore
    this.app = treaty<App>(window.location.origin, {
      headers: {
        accept: "application/x-msgpack",
      },
      // @ts-ignore
      onRequest: (_path, { body }) => {
        if (typeof body === "object") {
          return {
            headers: {
              "content-type": "application/x-msgpack",
            },
            body: packr.pack(body),
          };
        }
      },
      onResponse: async (response) => {
        if (
          response.headers.get("Content-Type")?.startsWith("application/x-msgpack")
        ) {
          return response
            .arrayBuffer()
            .then((buffer) => packr.unpack(new Uint8Array(buffer)));
        }
      },
    });
  }
}
