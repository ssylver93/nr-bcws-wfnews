import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { RoFPageComponent } from '../rofPage';
import { ReportOfFire } from '../reportOfFireModel';
import { ReportOfFirePageComponent } from '@app/components/report-of-fire/report-of-fire.component';

@Component({
  selector: 'rof-comments-page',
  templateUrl: './rof-comments-page.component.html',
  styleUrls: ['./rof-comments-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoFCommentsPageComponent extends RoFPageComponent {
  @ViewChild('commentText', { static: false }) commentTextArea: ElementRef;
  isEditMode = false;
  isPageDirty = false;
  maxLength = 500;
  hasEnteredTextArea = false;
  public constructor(
    private cdr: ChangeDetectorRef,
    private reportOfFirePage: ReportOfFirePageComponent,
  ) {
    super();
  }

  initialize(data: any, index: number, reportOfFire: ReportOfFire) {
    super.initialize(data, index, reportOfFire);
  }

  editMode() {
    this.isPageDirty = false;
    this.isEditMode = true;
    this.cdr.detectChanges();
  }

  onTextAreaChange() {
    this.isPageDirty = true;
  }

  backToReview() {
    this.reportOfFirePage.edit('review-page');
  }

  enterTextArea() {
    if (!this.hasEnteredTextArea && this.commentTextArea) {
      const textarea: HTMLTextAreaElement = this.commentTextArea.nativeElement;
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      textarea.scrollTop = textarea.scrollHeight;
      this.hasEnteredTextArea = true;
    }
  }

  exitTextArea() {
    // Reset the flag when the textarea loses focus
    this.hasEnteredTextArea = false;
  }
}
