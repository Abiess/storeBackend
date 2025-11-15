import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-video-placeholder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-placeholder.component.html',
  styleUrls: ['./video-placeholder.component.scss']
})
export class VideoPlaceholderComponent {
  @Input() title: string = 'DEMO';
  @Input() icon: string = '🎥';
  @Input() size: 'large' | 'small' = 'small';

  constructor(private router: Router) {}

  onPlayClick() {
    // Navigiert zur Registrierung wenn auf Play geklickt wird
    this.router.navigate(['/register']);
  }
}

