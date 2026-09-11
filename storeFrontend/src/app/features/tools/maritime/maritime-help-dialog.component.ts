import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Kleiner Hilfe-/FAQ-Dialog für die Maritime-Seite (Phase 3A).
 *
 * Wiederverwendung des bestehenden Angular-Material-Dialog-Patterns (siehe z.B.
 * DeliveryZoneDialogComponent) statt einer neuen Modal-Komponente. Wird über das
 * dezente "?"-Icon in maritime.component.html geöffnet (this.dialog.open(...)),
 * ersetzt die vorherige, große FAQ-Card, die vor der Vessel-Liste stand.
 */
@Component({
  selector: 'app-maritime-help-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, TranslatePipe],
  templateUrl: './maritime-help-dialog.component.html',
  styleUrls: ['./maritime-help-dialog.component.scss']
})
export class MaritimeHelpDialogComponent {
  constructor(private dialogRef: MatDialogRef<MaritimeHelpDialogComponent>) {}

  close(): void {
    this.dialogRef.close();
  }
}
