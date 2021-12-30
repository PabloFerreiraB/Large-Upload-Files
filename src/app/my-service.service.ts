import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BehaviorSubject, lastValueFrom } from 'rxjs';

import { Buffer } from 'buffer';

@Injectable({
  providedIn: 'root',
})
export class MyServiceService {
  progress = new BehaviorSubject({ total: 0, current: 0 });

  constructor(private http: HttpClient) {}

  fileUpload(file: any, fileName: string) {
    return new Promise((resolve, reject) => {
      this.progress.next({ total: 0, current: 0 });

      let fileReader = new FileReader();

      fileReader.readAsArrayBuffer(file); // Lê o arquivo usando a API fileReader HTML5 (como um ArrayBuffer)
      fileReader.onload = async (event: any) => {
        const chunks = await this._chunk(event.target.result, 83886);
        const idGUID = this._generateGUID();

        // console.log('CHUNKS', chunks);

        this._uploadFile(idGUID, fileName, chunks, resolve, reject);
      };
    });
  }

  private async _uploadFile(
    idGUID: string,
    fileName: string,
    chunks: any[],
    resolve: { (value: unknown): void; (arg0: any): void },
    reject: { (reason?: any): void; (arg0: any): void }
  ) {
    let index = 0;
    for await (const chunk of chunks) {
      const data = {
        fileName,
        id: idGUID,
        order: index++,
        result: chunk,
      };

      try {
        await this._uploadFileChunk(data);
        this.progress.next({ total: chunks.length, current: index });
      } catch (error) {
        this.progress.next({ total: 0, current: 0 });
        reject(error);
      }
    }

    resolve('Upload concluído!');
  }

  private _chunk(s: string, maxBytes: number): Promise<any[]> {
    return new Promise((resolve) => {
      let buf = Buffer.from(s);
      const result = [];

      while (buf.length) {
        let i = buf.lastIndexOf(32, maxBytes + 1);
        if (i < 0) i = buf.indexOf(32, maxBytes); // Se nenhum espaço for encontrado, tente a busca direta
        if (i < 0) i = buf.length; // Se não houver espaço algum, pegue a string inteira

        result.push(buf.slice(0, i).toString()); // Corte de ponto certo, nunca no meio de um multibyte (caso exista)
        buf = buf.slice(i + 1); // Pular espaço (se houver)
      }

      resolve(result);
    });
  }

  private async _executePost(url: string, data: any, requestHeaders: any) {
    return lastValueFrom(this.http.post(url, data, requestHeaders));
  }

  private _uploadFileChunk(data: any) {
    return new Promise((resolve, reject) => {
      const endpoint = 'https://httpbin.org/post';

      const headers = {
        Accept: 'application/json',
        'Content-Type': 'multipart/form-data',
      };

      this._executePost(endpoint, data, headers)
        .then((offset) => resolve(offset))
        .catch((err) => reject(err));
    });
  }

  private _generateGUID() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return (
      s4() +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      s4() +
      s4()
    );
  }
}
