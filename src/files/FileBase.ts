
import * as path from 'path';
export class FileBase
{
    public constructor(filePath:string)
    {
        this.basename = path.basename(filePath);
        this.directory = path.dirname(filePath);
        this.ext = filePath.split('.').slice(-1)[0];
    }

    protected directory:string;
    protected basename:string;
    protected ext:string;
}