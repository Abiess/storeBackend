import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';
import { PageHeaderComponent } from '@app/shared/components/page-header.component';
import { ResponsiveDataListComponent, ColumnConfig, ActionConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';
import { AppNavigationComponent } from '@app/shared/components/app-navigation/app-navigation.component';
import { DocumentDTO, DocumentsService } from '@app/core/services/documents.service';
import { DOCUMENTS_NAV_CONFIG } from './documents-nav.config';
import { DocumentUploadDialogComponent, DocumentUploadDialogData } from './document-upload-dialog.component';
import { DocumentFormDialogComponent, DocumentFormDialogData, DocumentFormResult } from './document-form-dialog.component';
import { DocumentDetailDialogComponent, DocumentDetailDialogData, DocumentDetailDialogResult } from './document-detail-dialog.component';
import { DocumentShareDialogComponent, DocumentShareDialogData } from './document-share-dialog.component';

/**
 * DOCUMENTS-App (Phase 1) – persönlicher Dokumenten-Tresor, Startseite.
 *
 * Faktortest App-Factory (analog MARITIME/DHL): GLOBAL-Scope (kein
 * `storeId`/Context, siehe `DOCUMENTS_NAV_CONFIG` mit `scoped: false`) →
 * keine Context-Auswahl-Route nötig, direkter Einstieg unter `/apps/documents`.
 *
 * Liste nutzt PFLICHTGEMÄSS `ResponsiveDataListComponent` (Karten auf Mobile,
 * Tabelle auf Desktop möglich) statt einer eigenen Card-Grid-Implementierung
 * – siehe Projekt-Konvention "WICHTIGSTE REGEL" für Listen-UIs.
 */
@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, TranslatePipe, MatButtonModule, MatIconModule, PageHeaderComponent, ResponsiveDataListComponent, AppNavigationComponent],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss']
})
export class DocumentsComponent implements OnInit {
  private dialog = inject(MatDialog);
  private documentsService = inject(DocumentsService);
  private translationService = inject(TranslationService);

  /** Verstecktes Kamera-Input für die Quick-Action "Fotografieren": wird direkt angeklickt,
   *  kein Zwischen-Dialog mit einem zweiten Button mehr (siehe takePhoto()/onCameraFileSelected()). */
  @ViewChild('cameraFileInput') cameraFileInput!: ElementRef<HTMLInputElement>;

  readonly navConfig = DOCUMENTS_NAV_CONFIG;

  activeTab: 'mine' | 'shared' = 'mine';
  mineDocuments: DocumentDTO[] = [];
  sharedDocuments: DocumentDTO[] = [];
  loading = true;

  columns: ColumnConfig[];
  actions: ActionConfig[];

  constructor() {
    const t = (key: string) => this.translationService.translate(key);
    this.columns = [
      { key: 'title', label: t('documents.table.title'), type: 'text', mobileLabel: t('documents.table.title') },
      {
        key: 'category', label: t('documents.table.category'), type: 'badge', mobileLabel: t('documents.table.category'),
        formatFn: (v) => v ? this.translationService.translate('documents.categories.' + v) : '—',
        badgeClass: () => 'status-active'
      },
      { key: 'documentDate', label: t('documents.table.documentDate'), type: 'date', mobileLabel: t('documents.table.documentDate'), hideOnMobile: true },
      { key: 'expiryDate', label: t('documents.table.expiryDate'), type: 'date', mobileLabel: t('documents.table.expiryDate') }
    ];
    this.actions = [
      { icon: '👁️', label: t('documents.actions.view'), handler: (item) => this.openDetail(item) }
    ];
  }

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.loading = true;
    this.documentsService.listMine().subscribe({
      next: (docs) => { this.mineDocuments = docs; this.loading = false; },
      error: () => { this.loading = false; }
    });
    this.documentsService.listSharedWithMe().subscribe({
      next: (docs) => { this.sharedDocuments = docs; }
    });
  }

  setTab(tab: 'mine' | 'shared'): void {
    this.activeTab = tab;
  }

  get visibleDocuments(): DocumentDTO[] {
    return this.activeTab === 'mine' ? this.mineDocuments : this.sharedDocuments;
  }

  /**
   * Vereinfachter Foto-Flow (vorher: Button -> Dialog -> nochmal Button -> Kamera).
   * Jetzt: Button klickt DIREKT das versteckte Kamera-Input an, das bewusst
   * `capture="environment"` trägt, damit iPhone/Android möglichst direkt die Rückkamera
   * öffnen (kein Kamera/Galerie-Auswahl-Dialog des OS). Erst NACH der Auswahl öffnet sich
   * der Dialog, direkt im Metadaten-Formular (Datei ist dann schon via
   * DocumentsService.materializeFile() materialisiert - siehe onCameraFileSelected()).
   */
  takePhoto(): void {
    this.cameraFileInput.nativeElement.click();
  }

  async onCameraFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // Reset, damit dieselbe Datei erneut gewählt werden kann

    if (!file) {
      return;
    }

    // iOS/WKWebView-Fix: Bytes sofort materialisieren, BEVOR der Dialog geöffnet wird (siehe
    // DocumentsService.materializeFile() für Details zum ephemeren Kamera-Blob-Problem).
    const stableFile = await this.documentsService.materializeFile(file);
    this.openUploadDialog('camera', stableFile);
  }

  uploadFile(): void {
    this.openUploadDialog('file');
  }

  private openUploadDialog(mode: 'camera' | 'file', file?: File): void {
    const ref = this.dialog.open<DocumentUploadDialogComponent, DocumentUploadDialogData, DocumentDTO | undefined>(
      DocumentUploadDialogComponent,
      { width: '420px', maxWidth: '92vw', data: { mode, file } }
    );
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.reload();
      }
    });
  }

  createManual(): void {
    const ref = this.dialog.open<DocumentFormDialogComponent, DocumentFormDialogData, DocumentFormResult | undefined>(
      DocumentFormDialogComponent,
      { width: '420px', maxWidth: '92vw', data: {} }
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      this.documentsService.createManual(result).subscribe(() => this.reload());
    });
  }

  openDetail(document: DocumentDTO): void {
    const ref = this.dialog.open<DocumentDetailDialogComponent, DocumentDetailDialogData, DocumentDetailDialogResult>(
      DocumentDetailDialogComponent,
      { width: '480px', maxWidth: '92vw', data: { document, isOwner: !document.sharedWithMe } }
    );
    ref.afterClosed().subscribe((action) => {
      if (action === 'edit') {
        this.openEdit(document);
      } else if (action === 'share') {
        this.openShare(document);
      } else if (action === 'delete') {
        this.confirmDelete(document);
      }
    });
  }

  private openEdit(document: DocumentDTO): void {
    const ref = this.dialog.open<DocumentFormDialogComponent, DocumentFormDialogData, DocumentFormResult | undefined>(
      DocumentFormDialogComponent,
      { width: '420px', maxWidth: '92vw', data: { document } }
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      this.documentsService.update(document.id, result).subscribe(() => this.reload());
    });
  }

  private openShare(document: DocumentDTO): void {
    this.dialog.open<DocumentShareDialogComponent, DocumentShareDialogData>(
      DocumentShareDialogComponent,
      { width: '420px', maxWidth: '92vw', data: { documentId: document.id, documentTitle: document.title } }
    );
  }

  private confirmDelete(document: DocumentDTO): void {
    const message = this.translationService.translate('documents.confirmDelete');
    if (!confirm(message)) {
      return;
    }
    this.documentsService.delete(document.id).subscribe(() => this.reload());
  }
}
