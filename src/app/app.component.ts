import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Component } from '@angular/core';
import { MyServiceService } from './my-service.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'app-test';
  progress = '';
  eightMB = 1024 * 1024 * 8; // 8 MB

  constructor(private _service: MyServiceService, private http: HttpClient) {}

  upload(file: any) {
    const [targetFile] = file?.target?.files;
    const chunckSize = this.eightMB;

    this.readFile(targetFile, chunckSize, this.callback.bind(this));
  }

  callback(file: any, chunckSize: number, result: boolean) {
    if (result) {
      this.readFile(file, chunckSize, this.callback.bind(this));
    } else {
      // Fazer alguma coisa
    }
  }

  readFile(file: any, chunckSize: number, callback: any) {
    const fileBlob = file.slice(chunckSize, chunckSize + this.eightMB);

    if (fileBlob.size != 0) {
      let fileReader = new FileReader();

      fileReader.onloadend = () => {
        return callback(file, chunckSize, fileReader.result);
      };

      console.log('ChunckSize: ', fileBlob.size);

      this._service.upload(fileBlob).subscribe((event: HttpEvent<Object>) => {
        switch (event.type) {
          case HttpEventType.Sent:
            console.log('Vídeo enviado.');
            break;
          case HttpEventType.ResponseHeader:
            console.log('O cabeçalho da resposta foi recebido.');
            break;
          case HttpEventType.UploadProgress:
            let percentComplete = Math.round(
              (event.loaded / (event.total ? event.total : 0)) * 100
            );

            this.progress = 'Foi ' + percentComplete + '% carregado.';

            break;
          case HttpEventType.Response:
            console.log('Vídeo enviado com sucesso.', event.body);
        }
      });

      fileReader.readAsArrayBuffer(fileBlob);

      // (async () => {
      //   const rawResponse = await fetch('https://httpbin.org/post', {
      //     method: 'POST',
      //     headers: {
      //       Accept: 'application/json',
      //       'Content-Type': 'multipart/form-data',
      //     },
      //     // body: JSON.stringify({ a: 'teste' }),
      //     body: fileBlob,
      //   });

      //   const content = await rawResponse.json();
      //   console.log('AQUI', content);
      // })();

      // fetch('https://httpbin.org/post', {
      //   method: 'post',
      //   headers: {
      //     Accept: 'application/json',
      //     'Content-Type': 'multipart/form-data',
      //   },
      //   body: fileBlob,
      // })
      //   .then((res) => res.json())
      //   .then((res) => console.log('RESULT', res));

      // fileReader.readAsArrayBuffer(fileBlob);
    } else {
      return callback(file, chunckSize, false);
    }
  }
}
