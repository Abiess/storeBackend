import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ChatbotManagementService, ChatbotIntent, ChatbotStatistics } from '../../services/chatbot-management.service';

@Component({
  selector: 'app-chatbot-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './chatbot-management.component.html',
  styleUrls: ['./chatbot-management.component.scss']
})
export class ChatbotManagementComponent implements OnInit {
  storeId!: number;
  intents: ChatbotIntent[] = [];
  statistics: ChatbotStatistics | null = null;
  loading = false;
  error: string | null = null;

  showIntentModal = false;
  showTestModal = false;
  editingIntent: ChatbotIntent | null = null;
  intentForm!: FormGroup;
  testForm!: FormGroup;
  testResult: any = null;

  availableActions = [
    { value: 'CHECK_ORDER', label: 'Bestellung prüfen' },
    { value: 'SHOW_FAQ', label: 'FAQ anzeigen' },
    { value: 'TRANSFER_TO_AGENT', label: 'An Mitarbeiter weiterleiten' },
    { value: 'SHOW_MENU', label: 'Menü anzeigen' },
    { value: 'END_SESSION', label: 'Gespräch beenden' }
  ];

  constructor(
    private chatbotService: ChatbotManagementService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.storeId = +params['id'] || +params['storeId'];
      this.loadIntents();
      this.loadStatistics();
    });
  }

  private initForms(): void {
    this.intentForm = this.fb.group({
      intentName: ['', Validators.required],
      description: [''],
      trainingPhrases: this.fb.array([this.fb.control('')]),
      responseTemplate: ['', Validators.required],
      action: ['SHOW_MENU', Validators.required],
      confidenceThreshold: [0.7, [Validators.required, Validators.min(0), Validators.max(1)]],
      isActive: [true]
    });

    this.testForm = this.fb.group({
      message: ['', Validators.required]
    });
  }

  get trainingPhrases(): FormArray {
    return this.intentForm.get('trainingPhrases') as FormArray;
  }

  addTrainingPhrase(): void {
    this.trainingPhrases.push(this.fb.control(''));
  }

  removeTrainingPhrase(index: number): void {
    if (this.trainingPhrases.length > 1) {
      this.trainingPhrases.removeAt(index);
    }
  }

  loadIntents(): void {
    this.loading = true;
    this.error = null;

    this.chatbotService.getIntents(this.storeId).subscribe({
      next: (intents) => {
        this.intents = intents;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading intents', error);
        this.error = 'Fehler beim Laden der Intents';
        this.loading = false;
      }
    });
  }

  loadStatistics(): void {
    this.chatbotService.getStatistics(this.storeId).subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics', error);
      }
    });
  }

  openCreateModal(): void {
    this.editingIntent = null;
    this.intentForm.reset({
      isActive: true,
      action: 'SHOW_MENU',
      confidenceThreshold: 0.7
    });
    this.trainingPhrases.clear();
    this.trainingPhrases.push(this.fb.control(''));
    this.showIntentModal = true;
  }

  openEditModal(intent: ChatbotIntent): void {
    this.editingIntent = intent;

    // Parse training phrases if string
    let phrases: string[] = [];
    if (typeof intent.trainingPhrases === 'string') {
      try {
        phrases = JSON.parse(intent.trainingPhrases);
      } catch (e) {
        phrases = [intent.trainingPhrases];
      }
    } else if (Array.isArray(intent.trainingPhrases)) {
      phrases = intent.trainingPhrases;
    }

    this.intentForm.patchValue({
      intentName: intent.intentName,
      description: intent.description,
      responseTemplate: intent.responseTemplate,
      action: intent.action,
      confidenceThreshold: intent.confidenceThreshold,
      isActive: intent.isActive
    });

    this.trainingPhrases.clear();
    phrases.forEach(phrase => {
      this.trainingPhrases.push(this.fb.control(phrase));
    });

    this.showIntentModal = true;
  }

  saveIntent(): void {
    if (this.intentForm.invalid) {
      Object.keys(this.intentForm.controls).forEach(key => {
        this.intentForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.intentForm.value;
    const intentData = {
      ...formValue,
      trainingPhrases: formValue.trainingPhrases.filter((p: string) => p.trim())
    };

    if (this.editingIntent) {
      // Update
      this.chatbotService.updateIntent(this.storeId, this.editingIntent.id!, intentData).subscribe({
        next: () => {
          this.showIntentModal = false;
          this.loadIntents();
          alert('Intent erfolgreich aktualisiert!');
        },
        error: (error) => {
          console.error('Error updating intent', error);
          alert('Fehler beim Aktualisieren des Intents');
        }
      });
    } else {
      // Create
      this.chatbotService.createIntent(this.storeId, intentData).subscribe({
        next: () => {
          this.showIntentModal = false;
          this.loadIntents();
          alert('Intent erfolgreich erstellt!');
        },
        error: (error) => {
          console.error('Error creating intent', error);
          alert('Fehler beim Erstellen des Intents');
        }
      });
    }
  }

  deleteIntent(intent: ChatbotIntent): void {
    if (!confirm(`Möchten Sie den Intent "${intent.intentName}" wirklich löschen?`)) {
      return;
    }

    this.chatbotService.deleteIntent(this.storeId, intent.id!).subscribe({
      next: () => {
        this.loadIntents();
        alert('Intent erfolgreich gelöscht!');
      },
      error: (error) => {
        console.error('Error deleting intent', error);
        alert('Fehler beim Löschen des Intents');
      }
    });
  }

  toggleIntent(intent: ChatbotIntent): void {
    this.chatbotService.toggleIntent(this.storeId, intent.id!).subscribe({
      next: () => {
        intent.isActive = !intent.isActive;
      },
      error: (error) => {
        console.error('Error toggling intent', error);
        alert('Fehler beim Umschalten des Intent-Status');
      }
    });
  }

  openTestModal(intent: ChatbotIntent): void {
    this.editingIntent = intent;
    this.testForm.reset();
    this.testResult = null;
    this.showTestModal = true;
  }

  testIntent(): void {
    if (this.testForm.invalid || !this.editingIntent) {
      return;
    }

    const message = this.testForm.value.message;

    this.chatbotService.testIntent(this.storeId, this.editingIntent.id!, message).subscribe({
      next: (result) => {
        this.testResult = result;
      },
      error: (error) => {
        console.error('Error testing intent', error);
        alert('Fehler beim Testen des Intents');
      }
    });
  }

  exportIntents(): void {
    const dataStr = JSON.stringify(this.intents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chatbot-intents-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  importIntents(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const intents = JSON.parse(e.target?.result as string);

        if (!Array.isArray(intents)) {
          alert('Ungültiges Format');
          return;
        }

        this.chatbotService.bulkImportIntents(this.storeId, intents).subscribe({
          next: () => {
            this.loadIntents();
            alert('Intents erfolgreich importiert!');
          },
          error: (error) => {
            console.error('Error importing intents', error);
            alert('Fehler beim Importieren der Intents');
          }
        });
      } catch (error) {
        alert('Fehler beim Parsen der Datei');
      }
    };

    reader.readAsText(file);
  }

  closeModal(): void {
    this.showIntentModal = false;
    this.showTestModal = false;
    this.editingIntent = null;
  }

  getTrainingPhrases(intent: ChatbotIntent): string[] {
    if (typeof intent.trainingPhrases === 'string') {
      try {
        return JSON.parse(intent.trainingPhrases);
      } catch (e) {
        return [intent.trainingPhrases];
      }
    }
    return Array.isArray(intent.trainingPhrases) ? intent.trainingPhrases : [];
  }
}

