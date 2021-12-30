import { Component, OnInit } from '@angular/core';

import { MyServiceService } from '../my-service.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
})
export class FileUploadComponent implements OnInit {
  currentProgress: string = '0';

  constructor(private _myServiceService: MyServiceService) {}

  ngOnInit(): void {
    this._myServiceService.progress.subscribe({
      next: (res) => {
        const val = (res.current / res.total) * 100;
        this.currentProgress = val ? val.toFixed(2) : '0';
      },
      error: (err) => {
        console.log(err);
      },
    });
  }

  upload(event: any) {
    const fileList: FileList = event?.target?.files;
    if (fileList.length != 0) {
      this._myServiceService
        .fileUpload(fileList[0], fileList[0].name)
        .then((res) => {
          alert(res);
        })
        .catch((error) => {
          console.log('Erro ao enviar' + error);
        });
    }
  }
}
