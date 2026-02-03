import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-choose-path',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './choose-path.component.html',
  styleUrls: ['./choose-path.component.scss']
})
export class ChoosePathComponent implements OnInit {
  userEmail = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.userEmail = user?.email || '';
  }

  selectPath(pathType: 'own-store' | 'reseller'): void {
    // Store the choice in localStorage
    localStorage.setItem('preferredStoreType', pathType);

    // Navigate to dashboard to open create store modal
    this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}

