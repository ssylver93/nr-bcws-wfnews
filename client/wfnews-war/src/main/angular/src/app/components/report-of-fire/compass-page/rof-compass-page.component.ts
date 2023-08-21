import { Component } from '@angular/core';
import { RoFPage } from "../rofPage";
import { ReportOfFire } from '../reportOfFireModel';

@Component({
  selector: 'rof-compass-page',
  templateUrl: './rof-compass-page.component.html',
  styleUrls: ['./rof-compass-page.component.scss']
})
export class RoFCompassPage extends RoFPage {
  public compassFaceUrl: string
  public compassHandUrl: string

  initialize (data: any, index: number, reportOfFire: ReportOfFire) {
    super.initialize(data, index, reportOfFire);
    this.compassFaceUrl = data.compassFaceUrl;
    this.compassHandUrl = data.compassHandUrl;
    
  }
}
