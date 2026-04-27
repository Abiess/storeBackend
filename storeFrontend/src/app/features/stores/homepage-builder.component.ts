import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HomepageSectionService } from '@app/core/services/homepage-section.service';
import { HomepageSection, SectionType, HeroSectionSettings, FeaturedProductsSettings, CategoriesSettings, BannerSettings, NewsletterSettings } from '@app/core/models';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';
import {StoreNavigationComponent} from "@app/shared/components/store-navigation.component";
import { FabService } from '@app/core/services/fab.service';

@Component({
  selector: 'app-homepage-builder',
  standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, PageHeaderComponent, StoreNavigationComponent],
  template: `
    <div class="homepage-builder">
     
        <app-store-navigation currentPage="HomBuilder
" ></app-store-navigation>
      <div class="builder-content">
        
        <!-- Section List -->
        <div class="sections-list">
          <div class="list-header">
            <h2>Sections</h2>
            <button class="btn-primary" (click)="openAddSectionModal()">
              + Section hinzufügen
            </button>
          </div>

          <div class="section-items" *ngIf="sections.length > 0">
            <div 
              class="section-item"
              *ngFor="let section of sections; let i = index"
              [class.inactive]="!section.isActive">
              
              <div class="section-drag-handle">☰</div>
              
              <div class="section-info">
                <div class="section-type">
                  {{ getSectionTypeLabel(section.sectionType) }}
                </div>
                <div class="section-order">Position: {{ i + 1 }}</div>
              </div>

              <div class="section-actions">
                <button 
                  class="btn-icon" 
                  (click)="toggleSection(section)"
                  [title]="section.isActive ? 'Deaktivieren' : 'Aktivieren'">
                  {{ section.isActive ? '👁️' : '🚫' }}
                </button>
                
                <button 
                  class="btn-icon" 
                  (click)="moveUp(i)"
                  [disabled]="i === 0"
                  title="Nach oben">
                  ⬆️
                </button>
                
                <button 
                  class="btn-icon" 
                  (click)="moveDown(i)"
                  [disabled]="i === sections.length - 1"
                  title="Nach unten">
                  ⬇️
                </button>
                
                <button 
                  class="btn-icon" 
                  (click)="editSection(section)"
                  title="Bearbeiten">
                  ⚙️
                </button>
                
                <button 
                  class="btn-icon btn-danger" 
                  (click)="deleteSection(section)"
                  title="Löschen">
                  🗑️
                </button>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="sections.length === 0">
            <p>Noch keine Sections vorhanden</p>
            <p>Klicken Sie auf "+ Section hinzufügen" um zu starten</p>
          </div>
        </div>

        <!-- Preview Info -->
        <div class="preview-info">
          <h3>💡 Hinweis</h3>
          <p>Die Sections werden in der angegebenen Reihenfolge auf Ihrer Storefront-Homepage angezeigt.</p>
          <p>Deaktivierte Sections sind ausgeblendet und werden nicht angezeigt.</p>
        </div>
      </div>
    </div>

    <!-- Add Section Modal -->
    <div class="modal" *ngIf="showAddModal" (click)="closeAddModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Section hinzufügen</h2>
          <button class="btn-close" (click)="closeAddModal()">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="section-types">
            <div 
              class="section-type-card"
              *ngFor="let type of availableSectionTypes"
              (click)="selectSectionType(type.value)">
              <div class="type-icon">{{ type.icon }}</div>
              <div class="type-name">{{ type.label }}</div>
              <div class="type-description">{{ type.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Section Modal -->
    <div class="modal" *ngIf="showEditModal && editingSection" (click)="closeEditModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ getSectionTypeLabel(editingSection.sectionType) }} bearbeiten</h2>
          <button class="btn-close" (click)="closeEditModal()">✕</button>
        </div>
        
        <div class="modal-body">
          <form [formGroup]="editForm">
            <!-- Hero Settings -->
            <div *ngIf="editingSection.sectionType === 'HERO'">
              <div class="form-group">
                <label>Titel</label>
                <input type="text" formControlName="title" class="form-control">
              </div>
              <div class="form-group">
                <label>Untertitel</label>
                <input type="text" formControlName="subtitle" class="form-control">
              </div>
              <div class="form-group">
                <label>Button Text</label>
                <input type="text" formControlName="buttonText" class="form-control">
              </div>
              <div class="form-group">
                <label>Button Link</label>
                <input type="text" formControlName="buttonLink" class="form-control">
              </div>
            </div>

            <!-- Featured Products Settings -->
            <div *ngIf="editingSection.sectionType === 'FEATURED_PRODUCTS'">
              <div class="form-group">
                <label>Titel</label>
                <input type="text" formControlName="title" class="form-control">
              </div>
              <div class="form-group">
                <label>Kategorie ID (optional)</label>
                <input type="number" formControlName="categoryId" class="form-control">
              </div>
              <div class="form-group">
                <label>Anzahl Produkte</label>
                <input type="number" formControlName="limit" class="form-control" min="1" max="12">
              </div>
            </div>

            <!-- Categories Settings -->
            <div *ngIf="editingSection.sectionType === 'CATEGORIES'">
              <div class="form-group">
                <label>Titel</label>
                <input type="text" formControlName="title" class="form-control">
              </div>
              <div class="form-group">
                <label>Anzahl Kategorien</label>
                <input type="number" formControlName="limit" class="form-control" min="1" max="12">
              </div>
            </div>

            <!-- Banner Settings -->
            <div *ngIf="editingSection.sectionType === 'BANNER'">
              <div class="form-group">
                <label>Bild URL</label>
                <input type="text" formControlName="imageUrl" class="form-control">
              </div>
              <div class="form-group">
                <label>Link</label>
                <input type="text" formControlName="link" class="form-control">
              </div>
              <div class="form-group">
                <label>Titel (optional)</label>
                <input type="text" formControlName="title" class="form-control">
              </div>
            </div>

            <!-- Newsletter Settings -->
            <div *ngIf="editingSection.sectionType === 'NEWSLETTER'">
              <div class="form-group">
                <label>Titel</label>
                <input type="text" formControlName="title" class="form-control">
              </div>
              <div class="form-group">
                <label>Beschreibung</label>
                <textarea formControlName="description" class="form-control" rows="3"></textarea>
              </div>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeEditModal()">Abbrechen</button>
          <button class="btn-primary" (click)="saveSection()" [disabled]="editForm.invalid || saving">
            {{ saving ? 'Speichern...' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .homepage-builder {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .builder-header {
      margin-bottom: 2rem;
    }

    .builder-header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      color: #1a202c;
    }

    .builder-header p {
      color: #718096;
      margin: 0;
    }

    .builder-content {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 2rem;
    }

    .sections-list {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .list-header h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }

    .section-items {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .section-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f7fafc;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .section-item:hover {
      border-color: #667eea;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
    }

    .section-item.inactive {
      opacity: 0.5;
      background: #f1f1f1;
    }

    .section-drag-handle {
      cursor: move;
      font-size: 1.25rem;
      color: #a0aec0;
    }

    .section-info {
      flex: 1;
    }

    .section-type {
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 0.25rem;
    }

    .section-order {
      font-size: 0.875rem;
      color: #718096;
    }

    .section-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.25rem;
      padding: 0.25rem;
      opacity: 0.8;
      transition: opacity 0.2s;
    }

    .btn-icon:hover:not(:disabled) {
      opacity: 1;
    }

    .btn-icon:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .btn-icon.btn-danger:hover {
      transform: scale(1.1);
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #a0aec0;
    }

    .empty-state p {
      margin: 0.5rem 0;
    }

    .preview-info {
      background: #edf2f7;
      border-radius: 12px;
      padding: 1.5rem;
      height: fit-content;
    }

    .preview-info h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 1rem;
      color: #2d3748;
    }

    .preview-info p {
      font-size: 0.9375rem;
      color: #4a5568;
      margin: 0 0 0.75rem;
      line-height: 1.6;
    }

    /* Modal Styles */
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .modal-header h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #a0aec0;
      padding: 0;
      line-height: 1;
    }

    .btn-close:hover {
      color: #718096;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .modal-footer {
      padding: 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .section-types {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    .section-type-card {
      padding: 1.5rem;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .section-type-card:hover {
      border-color: #667eea;
      background: #f7fafc;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    }

    .type-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .type-name {
      font-weight: 600;
      margin-bottom: 0.25rem;
      color: #2d3748;
    }

    .type-description {
      font-size: 0.75rem;
      color: #718096;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: #2d3748;
    }

    .form-control {
      width: 100%;
      padding: 0.625rem;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      font-size: 0.9375rem;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
    }

    textarea.form-control {
      resize: vertical;
      font-family: inherit;
    }

    .btn-primary, .btn-secondary {
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #e2e8f0;
      color: #2d3748;
    }

    .btn-secondary:hover {
      background: #cbd5e0;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .builder-content {
        grid-template-columns: 1fr;
      }

      .section-types {
        grid-template-columns: 1fr 1fr;
      }

      .section-item {
        flex-wrap: wrap;
      }

      .section-actions {
        width: 100%;
        justify-content: flex-end;
      }
    }
  `]
})
export class HomepageBuilderComponent implements OnInit, OnDestroy {
  storeId!: number;
  sections: HomepageSection[] = [];
  showAddModal = false;
  showEditModal = false;
  editingSection: HomepageSection | null = null;
  editForm!: FormGroup;
  saving = false;
  headerActions: HeaderAction[] = [];
  breadcrumbItems: BreadcrumbItem[] = [];

  availableSectionTypes = [
    { value: 'HERO' as SectionType, icon: '🎯', label: 'Hero / Slider', description: 'Hauptbereich mit Slider' },
    { value: 'FEATURED_PRODUCTS' as SectionType, icon: '⭐', label: 'Featured Products', description: 'Hervorgehobene Produkte' },
    { value: 'CATEGORIES' as SectionType, icon: '📂', label: 'Categories', description: 'Produktkategorien' },
    { value: 'BEST_SELLERS' as SectionType, icon: '🔥', label: 'Best Sellers', description: 'Bestseller Produkte' },
    { value: 'BANNER' as SectionType, icon: '🖼️', label: 'Banner', description: 'Bild mit Link' },
    { value: 'NEWSLETTER' as SectionType, icon: '📧', label: 'Newsletter', description: 'Newsletter Anmeldung' }
  ];

  constructor(
    private route: ActivatedRoute,
    private sectionService: HomepageSectionService,
    private fb: FormBuilder,
    private fabService: FabService
  ) {
    this.editForm = this.fb.group({
      title: [''],
      subtitle: [''],
      buttonText: [''],
      buttonLink: [''],
      categoryId: [''],
      limit: [8],
      imageUrl: [''],
      link: [''],
      description: [''],
      placeholderText: ['']
    });
  }

  ngOnInit(): void {
    // Unterstütze beide Parameternamen: 'storeId' und 'id'
    const storeIdParam = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    this.storeId = Number(storeIdParam);

    if (!this.storeId || isNaN(this.storeId)) {
      console.error('❌ Keine gültige storeId gefunden in Route-Parametern');
      return;
    }

    console.log('✅ Homepage Builder - storeId:', this.storeId);

    // Breadcrumbs initialisieren
    this.breadcrumbItems = [
      { label: 'navigation.dashboard', route: '/dashboard', icon: '🏠' },
      { label: 'navigation.store', route: ['/dashboard/stores', this.storeId], icon: '🏪' },
      { label: 'navigation.homepage', icon: '🏠' }
    ];
    
    // Header Actions
    this.headerActions = [
      {
        label: 'homepage.addSection',
        class: 'btn-primary',
        icon: '➕',
        onClick: () => this.openAddSectionModal()
      }
    ];
    
    this.loadSections();

    // FAB: Sektion hinzufügen + Live-Vorschau
    this.fabService.register({
      icon: '＋',
      label: 'Sektion hinzufügen',
      color: 'teal',
      action: () => this.openAddSectionModal(),
      speedDial: [
        { icon: '🏷', label: 'Hero-Banner', action: () => this.openAddSectionModal(), color: '#4fd1c5' },
        { icon: '📦', label: 'Produkte-Sektion', action: () => this.openAddSectionModal(), color: '#48bb78' },
        { icon: '👁', label: 'Live-Vorschau', action: () => window.open(`/storefront/${this.storeId}`, '_blank'), color: '#667eea' },
      ]
    });
  }

  ngOnDestroy(): void { this.fabService.clear(); }

  loadSections(): void {
    this.sectionService.getStoreSections(this.storeId).subscribe({
      next: (sections) => {
        this.sections = sections;
      },
      error: (err) => console.error('Error loading sections:', err)
    });
  }

  getSectionTypeLabel(type: SectionType): string {
    const found = this.availableSectionTypes.find(t => t.value === type);
    return found ? found.label : type;
  }

  openAddSectionModal(): void {
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  selectSectionType(type: SectionType): void {
    const sortOrder = this.sections.length;
    const request = {
      storeId: this.storeId,
      sectionType: type,
      sortOrder,
      isActive: true,
      settings: '{}'
    };

    this.sectionService.createSection(request).subscribe({
      next: (section) => {
        this.sections.push(section);
        this.closeAddModal();
      },
      error: (err) => console.error('Error creating section:', err)
    });
  }

  toggleSection(section: HomepageSection): void {
    this.sectionService.updateSection(this.storeId, section.id, {
      isActive: !section.isActive
    }).subscribe({
      next: () => {
        section.isActive = !section.isActive;
      },
      error: (err) => console.error('Error toggling section:', err)
    });
  }

  moveUp(index: number): void {
    if (index === 0) return;
    [this.sections[index], this.sections[index - 1]] = [this.sections[index - 1], this.sections[index]];
    this.reorderSections();
  }

  moveDown(index: number): void {
    if (index === this.sections.length - 1) return;
    [this.sections[index], this.sections[index + 1]] = [this.sections[index + 1], this.sections[index]];
    this.reorderSections();
  }

  reorderSections(): void {
    const sectionIds = this.sections.map(s => s.id);
    this.sectionService.reorderSections(this.storeId, sectionIds).subscribe({
      next: () => {
        this.loadSections();
      },
      error: (err) => console.error('Error reordering sections:', err)
    });
  }

  editSection(section: HomepageSection): void {
    this.editingSection = section;

    // Parse settings
    let settings: any = {};
    try {
      settings = JSON.parse(section.settings || '{}');
    } catch (e) {
      settings = {};
    }

    // Reset form
    this.editForm.reset();

    // Populate form based on section type
    if (section.sectionType === 'HERO') {
      this.editForm.patchValue({
        title: settings.title || '',
        subtitle: settings.subtitle || '',
        buttonText: settings.buttonText || '',
        buttonLink: settings.buttonLink || ''
      });
    } else if (section.sectionType === 'FEATURED_PRODUCTS' || section.sectionType === 'BEST_SELLERS') {
      this.editForm.patchValue({
        title: settings.title || '',
        categoryId: settings.categoryId || '',
        limit: settings.limit || 8
      });
    } else if (section.sectionType === 'CATEGORIES') {
      this.editForm.patchValue({
        title: settings.title || '',
        limit: settings.limit || 6
      });
    } else if (section.sectionType === 'BANNER') {
      this.editForm.patchValue({
        imageUrl: settings.imageUrl || '',
        link: settings.link || '',
        title: settings.title || ''
      });
    } else if (section.sectionType === 'NEWSLETTER') {
      this.editForm.patchValue({
        title: settings.title || '',
        description: settings.description || ''
      });
    }

    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingSection = null;
  }

  saveSection(): void {
    if (!this.editingSection || this.editForm.invalid) return;

    this.saving = true;
    const formValue = this.editForm.value;
    const settings = JSON.stringify(formValue);

    this.sectionService.updateSection(this.storeId, this.editingSection.id, {
      settings
    }).subscribe({
      next: () => {
        this.saving = false;
        this.closeEditModal();
        this.loadSections();
      },
      error: (err) => {
        console.error('Error saving section:', err);
        this.saving = false;
      }
    });
  }

  deleteSection(section: HomepageSection): void {
    if (!confirm('Section wirklich löschen?')) return;

    this.sectionService.deleteSection(this.storeId, section.id).subscribe({
      next: () => {
        this.sections = this.sections.filter(s => s.id !== section.id);
      },
      error: (err) => console.error('Error deleting section:', err)
    });
  }
}

