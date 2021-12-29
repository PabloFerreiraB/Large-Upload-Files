import { Component } from '@angular/core';

import { MyServiceService } from '../my-service.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
})
export class FileUploadComponent {
  constructor(private _myServiceService: MyServiceService) {}

  largeFileUpload(event: any) {
    let fileList: FileList = event?.target?.files;

    if (fileList.length != 0) {
      this._myServiceService
        .fileUpload(fileList[0], fileList[0].name)
        .then((addFileToFolder) => {
          console.log('Large File Uploaded Successfully');
        })
        .catch((error) => {
          console.log('Error while uploading' + error);
        });
    }
  }
}
