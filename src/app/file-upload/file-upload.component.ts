import { Component } from '@angular/core';

import { MyServiceService } from '../my-service.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
})
export class FileUploadComponent {
  constructor(private _myServiceService: MyServiceService) {}

  upload(event: any) {
    const fileList: FileList = event?.target?.files;

    if (fileList.length != 0) {
      this._myServiceService
        .fileUpload(fileList[0], fileList[0].name)
        .then((res) => {
          console.log('Arquivo carregado com sucesso', res);
        })
        .catch((error) => {
          console.log('Erro ao enviar' + error);
        });
    }
  }
}
