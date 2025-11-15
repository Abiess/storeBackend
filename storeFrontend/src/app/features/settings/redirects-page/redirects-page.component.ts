import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { SeoApiService, RedirectRuleDTO } from '../../../core/services/seo-api.service';
import { RedirectDialogComponent } from './redirect-dialog.component';

@Component({
  selector: 'app-redirects-page',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatChipsModule
  ],
  templateUrl: './redirects-page.component.html',
  styleUrls: ['./redirects-page.component.scss']
})
export class RedirectsPageComponent implements OnInit {
  storeId!: number;
  dataSource = new MatTableDataSource<RedirectRuleDTO>([]);
  displayedColumns = ['sourcePath', 'targetPath', 'statusCode', 'isActive', 'hitCount', 'actions'];
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private seoApi: SeoApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    this.loadRedirects();
  }

  loadRedirects(): void {
    this.loading = true;
    this.seoApi.getRedirectRules(this.storeId).subscribe({
      next: (redirects) => {
        this.dataSource.data = redirects;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load redirects', err);
        this.snackBar.open('Fehler beim Laden', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(RedirectDialogComponent, {
      width: '600px',
      data: { storeId: this.storeId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadRedirects();
      }
    });
  }

  onEdit(redirect: RedirectRuleDTO): void {
    const dialogRef = this.dialog.open(RedirectDialogComponent, {
      width: '600px',
      data: { storeId: this.storeId, redirect }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadRedirects();
      }
    });
  }

  onToggleActive(redirect: RedirectRuleDTO): void {
    const updated = { ...redirect, isActive: !redirect.isActive };
    this.seoApi.updateRedirectRule(this.storeId, updated).subscribe({
      next: () => {
        this.snackBar.open('✅ Status aktualisiert', 'OK', { duration: 2000 });
        this.loadRedirects();
      },
      error: (err) => {
        console.error('Failed to update redirect', err);
        this.snackBar.open('❌ Fehler beim Aktualisieren', 'OK', { duration: 3000 });
      }
    });
  }

  onDelete(redirect: RedirectRuleDTO): void {
    if (!confirm(`Redirect "${redirect.sourcePath}" wirklich löschen?`)) return;

    this.seoApi.deleteRedirectRule(this.storeId, redirect.id!).subscribe({
      next: () => {
        this.snackBar.open('✅ Redirect gelöscht', 'OK', { duration: 2000 });
        this.loadRedirects();
      },
      error: (err) => {
        console.error('Failed to delete redirect', err);
        this.snackBar.open('❌ Fehler beim Löschen', 'OK', { duration: 3000 });
      }
    });
  }

  onImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      // CSV import would be implemented here
      this.snackBar.open('CSV Import wird implementiert', 'OK', { duration: 2000 });
    }
  }

  onExport(): void {
    // CSV export would be implemented here
    this.snackBar.open('CSV Export wird implementiert', 'OK', { duration: 2000 });
  }
}

