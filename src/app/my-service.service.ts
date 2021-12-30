import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MyServiceService {
  constructor(private http: HttpClient) {}

  public fileUpload(file: any, fileName: string) {
    return new Promise((resolve, reject) => {
      let fileReader = new FileReader();
      let offset = 0; // Tamanho total do arquivo em bytes ...
      let total = file.size;
      // Pedaços de 1 MB representados em bytes
      // Se o arquivo tiver menos de 1 MB, separe-o em dois pedaços de 80% e 20% do tamanho
      let length = 1000000 > total ? Math.round(total * 0.8) : 1000000;
      let chunks: { offset: number; length: number; method: any }[] = [];

      fileReader.readAsArrayBuffer(file); // Lê o arquivo usando a API fileReader HTML5 (como um ArrayBuffer)
      fileReader.onload = (event: any) => {
        while (offset < total) {
          // Identificando se estamos lidando com a parte final do arquivo
          if (offset + length > total) {
            length = total - offset;
          }

          // Cria os pedaços que precisam ser processados e associa o método (O método foi apenas para eu ver xD)
          // startUpload, continueUpload ou finishUpload
          chunks.push({
            offset,
            length,
            method: this.getUploadMethod(offset, length, total),
          });

          offset += length;
        }

        // Cada pedaço vale uma porcentagem do tamanho total do arquivo
        const chunkPercentage = (total / chunks.length / total) * 100;
        console.log('Porcentagem de pedaços: ' + chunkPercentage);

        if (chunks.length > 0) {
          // O identificador guid único para ser usado no Payload
          const idGUID = this.generateGUID();

          // Inicie o upload
          this.uploadFile(
            event.target.result,
            idGUID,
            fileName,
            chunks,
            0, // index
            0, // byteOffset
            chunkPercentage,
            resolve,
            reject
          );
        }
      };
    });
  }

  async executePost(url: string, data: any, requestHeaders: any) {
    return this.http
      .post(url, data, requestHeaders)
      .toPromise()
      .catch((err: HttpErrorResponse) => {
        return err.error;
      });
  }

  // Base64 - Método converte o blob arrayBuffer em uma string binária para enviar
  convertDataBinaryString(data: any) {
    let fileData = '';
    let byteArray = new Uint8Array(data);

    for (let i = 0; i < byteArray.byteLength; i++) {
      fileData += String.fromCharCode(byteArray[i]);
    }

    return fileData;
  }

  // Helper - Dependendo de qual bloco de dados estamos lidando, precisamos usar o método Rest correto
  getUploadMethod(offset: any, length: any, total: any) {
    if (offset + length + 1 > total) {
      return 'finishUpload';
    } else if (offset === 0) {
      return 'startUpload';
    } else if (offset < total) {
      return 'continueUpload';
    }

    return null;
  }

  generateGUID() {
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

  // Método principal que chama resursivamente para obter os pedaços e enviá-los
  uploadFile(
    result: any,
    idGUID: string,
    fileName: string,
    chunks: string | any[],
    index: number,
    byteOffset: number,
    chunkPercentage: number,
    resolve: { (value: unknown): void; (arg0: any): void },
    reject: { (reason?: any): void; (arg0: any): void }
  ) {
    console.log('CHUNKS: ', chunks[index]);

    // Dividindo o blob do arquivo no pedaço que precisamos enviar nesta solicitação - ByteOffset diz a posição inicial
    const data = this.splitFileToBlobChunks(result, chunks[index]);

    // const results = new Blob(data as BlobPart[], { type: 'video/mp4' });

    // Faça upload do trecho para o servidor usando REST, usando o guid de upload exclusivo como o identificador
    this.uploadFileChunk(idGUID, fileName, chunks[index], data, byteOffset)
      .then((value: any) => {
        const isFinished = index === chunks.length - 1;
        index += 1;

        const percentageComplete = isFinished
          ? 100
          : Math.round(index * chunkPercentage);
        console.log('Porcentagem Concluída:' + percentageComplete);

        // Mais pedaços para processar antes que o arquivo seja concluído
        if (index < chunks.length) {
          this.uploadFile(
            result,
            idGUID,
            fileName,
            chunks,
            index,
            byteOffset,
            chunkPercentage,
            resolve,
            reject
          );
        } else {
          resolve(value);
        }
      })
      .catch((err) => {
        console.log('Erro no upload do fragmento de arquivo. ' + err);
        reject(err);
      });
  }

  // Método divide o buffer da matriz de blob no pedaço apropriado e, em seguida, chama para obter a BinaryString desse pedaço
  splitFileToBlobChunks(
    result: string | any[],
    chunkInfo: { offset: any; length: any }
  ) {
    return result.slice(chunkInfo.offset, chunkInfo.offset + chunkInfo.length);
  }

  // Este método configura a solicitação REST e, em seguida, envia o fragmento do arquivo junto com o identificador exclusivo (uploadId)
  uploadFileChunk(
    id: string,
    fileName: string,
    chunk: { offset: string | number; method: string },
    data: any,
    byteOffset: number
  ) {
    return new Promise((resolve, reject) => {
      const endpoint = 'https://httpbin.org/post';

      const headers = {
        Accept: 'application/json',
        'Content-Type': 'multipart/form-data',
      };

      this.executePost(endpoint, data, headers)
        .then((offset) => resolve(offset))
        .catch((err) => reject(err));
    });
  }

  // +*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+

  upload(file: any) {
    return this.http
      .post('https://httpbin.org/post', file, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(catchError(this.errorMgmt));
  }

  errorMgmt(error: HttpErrorResponse) {
    let errorMessage = '';

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = `Códio erro: ${error.status}\n Mensagem: ${error.message}`;
    }

    return throwError(errorMessage);
  }
}
