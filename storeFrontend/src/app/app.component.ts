import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'markt.ma - Multi-Tenant E-Commerce Platform';

  constructor(
    private authService: AuthService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    // FIXED: Verbinde AuthService mit CartService für Warenkorb-Bereinigung beim Logout
    this.authService.setCartService(this.cartService);
    console.log('✅ AuthService und CartService verbunden');
  }
}
