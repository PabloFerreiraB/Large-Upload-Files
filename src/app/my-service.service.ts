import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BehaviorSubject, lastValueFrom } from 'rxjs';

import { Buffer } from 'buffer';

@Injectable({
  providedIn: 'root',
})
export class MyServiceService {
  progress = new BehaviorSubject({ total: 0, current: 0 });

  private MB = 6; // = 8.4MB real
  private chunkSize = ((1024 * 1024) * this.MB);

  constructor(private http: HttpClient) {}

  fileUpload(file: any) {
    return new Promise(async (resolve, reject) => {
      this.progress.next({ total: 0, current: 0 });

      const { name, type } = file;
      const chunks = await this._chunk2(file, this.chunkSize);
      const idGUID = this._generateGUID();

      this._uploadFile(idGUID, name, type, chunks, resolve, reject);
      
    });
  }

  private _chunk2(file: File, maxBytes: number): Promise<any[]> {
    return new Promise((resolve) => {
      // let buf = Buffer.from(s);
      const result: any = [];
      // console.log(buf);
      // console.log(buf.length);

      
      const numberofChunks = Math.ceil(file.size/maxBytes);	   
      console.log(numberofChunks);

        let startPointer = 0;
        let endPointer = file.size;

        console.log(endPointer);
        
        
        while (startPointer < endPointer) {
         let newStartPointer = startPointer + maxBytes;
         result.push(file.slice(startPointer, newStartPointer));
         startPointer = newStartPointer;
        }

      resolve(result);
    });
  }


  private async _uploadFile(
    idGUID: string,
    fileName: string,
    type: string,
    chunks: any[],
    resolve: { (value: unknown): void; (arg0: any): void },
    reject: { (reason?: any): void; (arg0: any): void }
  ) {
    let index = 0;
    for await (const chunk of chunks) {
      console.log(chunk);
      
      const data = {
        fileName,
        type,
        id: idGUID,
        order: index++,
        result: chunk,
      };

      // const params = new URLSearchParams(data as any).toString()

      

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

  private async _executePost(url: string, data: any, requestHeaders: any = {}) {
    return lastValueFrom(this.http.post(url, data, requestHeaders));
  }

  private _uploadFileChunk(data: any) {
    return new Promise((resolve, reject) => {
      const endpoint = `https://httpbin.org/post`;

      const headers = {
        // Accept: 'application/json',
        // 'content-type': false,
      };

      const formData = new FormData();
      formData.append("fileName", data.fileName);
      formData.append("type", data.type);
      formData.append("id", data.id);
      formData.append("order", data.order);
      formData.append("result", data.result);

      this._executePost(endpoint, formData, { headers })
        .then((offset) => resolve(offset))
        .catch((err) => reject(err));
    });
  }

  // uploadChunk(chunkForm: any, start: any, chunkEnd: any){
  //   var oReq = new XMLHttpRequest();
  //   oReq.upload.addEventListener("progress", this._updateProgress);	
  //   oReq.open('POST', 'https://httpbin.org/post', true);
  //   var blobEnd = chunkEnd-1;
  //   var contentRange = 'bytes '+ start+'-'+ blobEnd+'/'+file.size;
  //   oReq.setRequestHeader('Content-Range',contentRange);
  //   console.log('Content-Range', contentRange);
  // }

  // _updateProgress (oEvent: any) {
  //   if (oEvent.lengthComputable) {  
  //   var percentComplete = Math.round(oEvent.loaded / oEvent.total * 100);

  //   var totalPercentComplete = Math.round((this.chunkCounter -1)/numberofChunks*100 +percentComplete/numberofChunks);
    
  //   console.log('Chunk # ' + this.chunkCounter + ' is ' + percentComplete + '% uploaded. Total uploaded: ' + totalPercentComplete +'%');
  // //	console.log (percentComplete);
  //   // ...
  //   } else {
  //     console.log ('not computable');
  //     // Unable to compute progress information since the total size is unknown
  //   }
  // }

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
