import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { PageHeaderComponent } from '@app/shared/components/page-header.component';
import { ImageUploadComponent, UploadedImage } from '@app/shared/components/image-upload/image-upload.component';
import { IssueAnalysisService } from '@app/core/services/issue-analysis.service';
import { LanguageService } from '@app/core/services/language.service';
import { IssueImageAnalysisResult } from '@app/core/models';

/**
 * TEMP / ISOLIERTER TEST: "Problem erkennen"
 *
 * Bild hochladen (bestehende app-image-upload-Komponente im AI-Modus, kein neuer
 * Upload-Mechanismus) → POST /api/test/issue-analysis → Ergebnis anzeigen.
 *
 * Kein Business-Feature: keine Handwerker-Suche, keine Persistenz, keine DB-Anbindung.
 * Nutzt exakt dasselbe Wiederverwendungs-Pattern wie die bestehende Produkt-KI-Analyse
 * (ImageUploadComponent im aiMode mit showAiGenerate, siehe product-form.component.ts).
 */
@Component({
  selector: 'app-issue-analysis',
  standalone: true,
  imports: [CommonModule, TranslatePipe, PageHeaderComponent, ImageUploadComponent],
  templateUrl: './issue-analysis.component.html',
  styleUrls: ['./issue-analysis.component.scss']
})
export class IssueAnalysisComponent {
  /** Wiederverwendung der bestehenden UploadedImage-Struktur (aiSuggestion trägt hier IssueImageAnalysisResult) */
  aiImages: UploadedImage[] = [];
  aiError = '';

  constructor(
    private issueAnalysisService: IssueAnalysisService,
    private languageService: LanguageService
  ) {}

  /** Wird von app-image-upload ausgelöst, sobald der 🤖-Button pro Bild geklickt wird */
  onAiGenerateRequest(event: { file: File; index: number }): void {
    this.analyzeImage(event.index);
  }

  onUploadError(message: string): void {
    this.aiError = message;
  }

  isAnyGenerating(): boolean {
    return this.aiImages.some(img => img.aiGenerating);
  }

  getResult(imgData: UploadedImage): IssueImageAnalysisResult | null {
    return imgData.aiSuggestion ?? null;
  }

  /** Confidence als Prozent für die Anzeige */
  confidencePercent(imgData: UploadedImage): number {
    const result = this.getResult(imgData);
    if (!result || result.confidence === null || result.confidence === undefined) return 0;
    return Math.round(result.confidence * 100);
  }

  urgencyClass(urgency: string | undefined): string {
    switch ((urgency || '').toUpperCase()) {
      case 'EMERGENCY': return 'urgency-emergency';
      case 'HIGH': return 'urgency-high';
      case 'MEDIUM': return 'urgency-medium';
      case 'LOW': return 'urgency-low';
      default: return 'urgency-medium';
    }
  }

  private analyzeImage(index: number): void {
    const imgData = this.aiImages[index];
    if (!imgData?.file) return;

    imgData.aiGenerating = true;
    imgData.aiError = '';
    imgData.aiSuggestion = null;
    this.aiError = '';

    const language = this.languageService.getCurrentLanguage() || 'de';

    this.issueAnalysisService.analyzeIssueImage(imgData.file, language).subscribe({
      next: (result: IssueImageAnalysisResult) => {
        imgData.aiSuggestion = result;
        imgData.aiGenerating = false;
      },
      error: (error: any) => {
        imgData.aiGenerating = false;
        imgData.aiError = error?.error?.error || error?.message || 'Analyse fehlgeschlagen.';
      }
    });
  }
}
