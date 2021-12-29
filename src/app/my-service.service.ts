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
      // Criando um arquivo fake
      this.createDummyFile().then((result: any) => {
        let fileReader = new FileReader();
        let offset = 0;

        // Tamanho total do arquivo em bytes ...
        let total = file.size;

        // Pedaços de 1 MB representados em bytes (se o arquivo tiver menos de 1 MB, separe-o em dois pedaços de 80% e 20% do tamanho)...
        let length = 1000000 > total ? Math.round(total * 0.8) : 1000000;
        let chunks: { offset: number; length: number; method: any }[] = [];

        // Lê o arquivo usando a API fileReader HTML5 (como um ArrayBuffer)
        fileReader.readAsArrayBuffer(file);

        fileReader.onload = (event: any) => {
          while (offset < total) {
            // Identificando se estamos lidando com a parte final do arquivo
            if (offset + length > total) {
              length = total - offset;
            }

            // Cria os pedaços que precisam ser processados e o método REST associado (iniciar, continuar ou terminar)
            chunks.push({
              offset,
              length,
              method: this.getUploadMethod(offset, length, total),
            });
            offset += length;
          }

          // Cada pedaço vale uma porcentagem do tamanho total do arquivo
          const chunkPercentage = (total / chunks.length / total) * 100;
          console.log('Chunk Percentage: ' + chunkPercentage);

          if (chunks.length > 0) {
            // O identificador guid único para ser usado durante a sessão de upload
            const id = this.generateGUID();

            // Inicie o upload
            this.uploadFile(
              event.target.result,
              id,
              fileName,
              chunks,
              0,
              0,
              chunkPercentage,
              resolve,
              reject
            );
          }
        };
      });
    });
  }

  createDummyFile() {
    return new Promise((resolve, reject) => {
      var endpoint = 'https://httpbin.org/post';

      const headers = {
        accept: 'application/json;odata=verbose',
      };

      this.executePost(endpoint, this.convertDataBinaryString(2), headers)
        .then((file) => resolve(true))
        .catch((err) => reject(err));
    });
  }

  async executePost(url: string, data: any, requestHeaders: any) {
    const res = await this.http
      .post(url, data, requestHeaders)
      .toPromise()
      .catch((err: HttpErrorResponse) => {
        return err.error;
      });
    return this.parseRetSingle(res);
  }

  // Base64 - este método converte o blob arrayBuffer em uma string binária para enviar a solicitação REST
  convertDataBinaryString(data: any) {
    let fileData = '';
    let byteArray = new Uint8Array(data);
    for (var i = 0; i < byteArray.byteLength; i++) {
      fileData += String.fromCharCode(byteArray[i]);
    }
    return fileData;
  }

  parseRetSingle(res: any) {
    if (res) {
      if (res.hasOwnProperty('d')) {
        return res.d;
      } else if (res.hasOwnProperty('error')) {
        const obj: any = res.error;
        obj.hasError = true;
        return obj;
      } else {
        return {
          hasError: true,
          comments: res,
        };
      }
    } else {
      return {
        hasError: true,
        comments: 'Verifique a resposta no rastreamento da rede',
      };
    }
  }

  // Helper - Dependendo de qual bloco de dados estamos lidando, precisamos usar o método Rest correto
  getUploadMethod(offset: any, length: any, total: any) {
    if (offset + length + 1 > total) {
      return 'finishupload';
    } else if (offset === 0) {
      return 'startupload';
    } else if (offset < total) {
      return 'continueupload';
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
    id: string,

    fileName: string,
    chunks: string | any[],
    index: number,
    byteOffset: number,
    chunkPercentage: number,
    resolve: { (value: unknown): void; (arg0: any): void },
    reject: { (reason?: any): void; (arg0: any): void }
  ) {
    // Dividimos o blob do arquivo no pedaço que precisamos enviar nesta solicitação (byteOffset nos diz a posição inicial)
    const data = this.convertFileToBlobChunks(result, chunks[index]);

    // Faça upload do trecho para o servidor usando REST, usando o guid de upload exclusivo como o identificador
    this.uploadFileChunk(id, fileName, chunks[index], data, byteOffset)
      .then((value: any) => {
        const isFinished = index === chunks.length - 1;
        index += 1;

        const percentageComplete = isFinished
          ? 100
          : Math.round(index * chunkPercentage);
        console.log('Percentage Completed:' + percentageComplete);

        // Mais pedaços para processar antes que o arquivo seja concluído
        if (index < chunks.length) {
          this.uploadFile(
            result,
            id,
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
  convertFileToBlobChunks(
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
    data: string | any[],
    byteOffset: number
  ) {
    return new Promise((resolve, reject) => {
      // let offset = chunk.offset === 0 ? '' : ',fileOffset=' + chunk.offset;
      // console.log('OFFSET', offset);

      // Parametrizar os componentes deste ponto de extremidade, para evitar o problema de comprimento máximo de url
      const endpoint = 'https://httpbin.org/post';

      // const endpoint =
      //   'https://httpbin.org/post' +
      //   '/' +
      //   fileName +
      //   "')/" +
      //   chunk.method +
      //   "(uploadId=guid'" +
      //   id +
      //   "'" +
      //   offset +
      //   ')';

      // https://httpbin.org/post/Test_ABC/na-daily.mp4')/startupload(uploadId=guid'5115f958-ef55-b33c-8534-d59b35dbc553')

      const headers = {
        Accept: 'application/json; odata=verbose',
        'Content-Type': 'application/octet-stream',
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
