import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CJIntegrationService } from '../../core/services/cj-integration.service';
import { CJConnectionRequest, CJConnectionStatus } from '../../core/models/dropshipping.model';

/**
 * CJ Dropshipping Connection Component
 * Minimal UI für CJ Account Verbindung
 */
@Component({
  selector: 'app-cj-connect',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cj-connect-container">
      <div class="card">
        <div class="card-header">
          <h3>🔗 CJ Dropshipping Connection</h3>
        </div>

        <div class="card-body">
          <!-- Connection Status -->
          <div *ngIf="connectionStatus" class="alert" 
               [class.alert-success]="connectionStatus.connected"
               [class.alert-warning]="!connectionStatus.connected">
            <strong>Status:</strong> {{ connectionStatus.message }}
          </div>

          <!-- Connect Form -->
          <div *ngIf="!connectionStatus?.connected" class="connect-form">
            <h5>Connect to CJ Account</h5>
            <p class="text-muted">Enter your CJ Dropshipping credentials to enable automatic order placement.</p>

            <div class="form-group">
              <label>CJ Email:</label>
              <input type="email" 
                     class="form-control" 
                     [(ngModel)]="email" 
                     placeholder="your-email@example.com"
                     [disabled]="loading">
            </div>

            <div class="form-group">
              <label>CJ Password:</label>
              <input type="password" 
                     class="form-control" 
                     [(ngModel)]="password"
                     placeholder="Your CJ password"
                     [disabled]="loading">
            </div>

            <div class="form-actions">
              <button class="btn btn-primary" 
                      (click)="connect()"
                      [disabled]="loading || !email || !password">
                <span *ngIf="loading">⏳ Connecting...</span>
                <span *ngIf="!loading">🔗 Connect CJ</span>
              </button>
            </div>
          </div>

          <!-- Disconnect Button -->
          <div *ngIf="connectionStatus?.connected" class="disconnect-section">
            <p>✅ Your store is connected to CJ Dropshipping.</p>
            <button class="btn btn-danger" 
                    (click)="disconnect()"
                    [disabled]="loading">
              <span *ngIf="loading">⏳ Disconnecting...</span>
              <span *ngIf="!loading">🔌 Disconnect</span>
            </button>
          </div>

          <!-- Error Message -->
          <div *ngIf="errorMessage" class="alert alert-danger mt-3">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cj-connect-container {
      max-width: 600px;
      margin: 2rem auto;
    }

    .card {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }

    .card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
    }

    .card-header h3 {
      margin: 0;
      font-size: 1.5rem;
    }

    .card-body {
      padding: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-actions {
      margin-top: 2rem;
    }

    .btn {
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-1px);
    }

    .btn-danger {
      background: #e74c3c;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #c0392b;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .alert {
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1.5rem;
    }

    .alert-success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .alert-warning {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }

    .alert-danger {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .text-muted {
      color: #6c757d;
      font-size: 0.9rem;
    }

    .disconnect-section {
      text-align: center;
    }
  `]
})
export class CJConnectComponent implements OnInit {
  storeId!: number;
  email = '';
  password = '';
  loading = false;
  errorMessage = '';
  connectionStatus: CJConnectionStatus | null = null;

  constructor(
    private route: ActivatedRoute,
    private cjService: CJIntegrationService
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    this.loadConnectionStatus();
  }

  loadConnectionStatus(): void {
    this.loading = true;
    this.cjService.getConnectionStatus(this.storeId).subscribe({
      next: (status) => {
        this.connectionStatus = status;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load CJ status:', err);
        this.loading = false;
      }
    });
  }

  connect(): void {
    this.loading = true;
    this.errorMessage = '';

    const request: CJConnectionRequest = {
      email: this.email,
      password: this.password
    };

    this.cjService.connectStore(this.storeId, request).subscribe({
      next: (response) => {
        this.connectionStatus = response;
        this.loading = false;
        this.password = ''; // Clear password
        if (response.connected) {
          alert('✅ CJ connected successfully!');
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to connect to CJ';
        this.loading = false;
      }
    });
  }

  disconnect(): void {
    if (!confirm('Are you sure you want to disconnect from CJ?')) {
      return;
    }

    this.loading = true;
    this.cjService.disconnectStore(this.storeId).subscribe({
      next: (response) => {
        this.connectionStatus = response;
        this.loading = false;
        alert('✅ CJ disconnected');
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to disconnect';
        this.loading = false;
      }
    });
  }
}

