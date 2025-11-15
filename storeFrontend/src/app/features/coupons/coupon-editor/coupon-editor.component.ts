import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CouponService, CouponDTO } from '../../../core/services/coupon.service';

@Component({
  selector: 'app-coupon-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './coupon-editor.component.html',
  styleUrls: ['./coupon-editor.component.scss']
})
export class CouponEditorComponent implements OnInit {
  storeId!: number;
  couponId?: number;
  couponForm!: FormGroup;
  loading = false;
  saving = false;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private couponService: CouponService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    const id = this.route.snapshot.paramMap.get('id');

    if (id && id !== 'new') {
      this.couponId = Number(id);
      this.isEditMode = true;
    }

    this.initForm();

    if (this.isEditMode && this.couponId) {
      this.loadCoupon();
    }
  }

  initForm(): void {
    this.couponForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(100)]],
      type: ['PERCENT', Validators.required],
      percentDiscount: [null],
      valueCents: [null],
      currency: ['EUR', Validators.required],
      startsAt: [null],
      endsAt: [null],
      minSubtotalCents: [null],
      appliesTo: ['ALL', Validators.required],
      productIds: [[]],
      categoryIds: [[]],
      collectionIds: [[]],
      customerEmails: [[]],
      domainScope: ['ALL', Validators.required],
      domainIds: [[]],
      usageLimitTotal: [null],
      usageLimitPerCustomer: [null],
      combinable: ['NONE', Validators.required],
      status: ['ACTIVE', Validators.required],
      autoApply: [false],
      description: ['']
    });

    this.couponForm.get('type')?.valueChanges.subscribe(type => {
      if (type === 'PERCENT') {
        this.couponForm.get('percentDiscount')?.setValidators([Validators.required, Validators.min(1), Validators.max(100)]);
        this.couponForm.get('valueCents')?.clearValidators();
      } else if (type === 'FIXED') {
        this.couponForm.get('valueCents')?.setValidators([Validators.required, Validators.min(1)]);
        this.couponForm.get('percentDiscount')?.clearValidators();
      } else {
        this.couponForm.get('percentDiscount')?.clearValidators();
        this.couponForm.get('valueCents')?.clearValidators();
      }
      this.couponForm.get('percentDiscount')?.updateValueAndValidity();
      this.couponForm.get('valueCents')?.updateValueAndValidity();
    });
  }

  loadCoupon(): void {
    if (!this.couponId) return;

    this.loading = true;
    this.couponService.getCoupon(this.storeId, this.couponId).subscribe({
      next: (coupon) => {
        this.couponForm.patchValue({
          ...coupon,
          startsAt: coupon.startsAt ? new Date(coupon.startsAt) : null,
          endsAt: coupon.endsAt ? new Date(coupon.endsAt) : null
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load coupon', err);
        this.snackBar.open('❌ Fehler beim Laden', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onSave(): void {
    if (this.couponForm.invalid) {
      this.snackBar.open('⚠️ Bitte alle Pflichtfelder ausfüllen', 'OK', { duration: 3000 });
      return;
    }

    this.saving = true;
    const formValue = this.couponForm.value;

    const coupon: CouponDTO = {
      ...formValue,
      startsAt: formValue.startsAt ? new Date(formValue.startsAt).toISOString() : undefined,
      endsAt: formValue.endsAt ? new Date(formValue.endsAt).toISOString() : undefined
    };

    const operation = this.isEditMode && this.couponId
      ? this.couponService.updateCoupon(this.storeId, this.couponId, coupon)
      : this.couponService.createCoupon(this.storeId, coupon);

    operation.subscribe({
      next: (saved) => {
        this.snackBar.open('✅ Gutschein gespeichert', 'OK', { duration: 2000 });
        this.saving = false;
        this.router.navigate(['/dashboard', this.storeId, 'coupons']);
      },
      error: (err) => {
        console.error('Failed to save coupon', err);
        const message = err.error?.message || 'Fehler beim Speichern';
        this.snackBar.open(`❌ ${message}`, 'OK', { duration: 4000 });
        this.saving = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/dashboard', this.storeId, 'coupons']);
  }

  get showPercentField(): boolean {
    return this.couponForm.get('type')?.value === 'PERCENT';
  }

  get showValueField(): boolean {
    return this.couponForm.get('type')?.value === 'FIXED';
  }

  get showProductFields(): boolean {
    const appliesTo = this.couponForm.get('appliesTo')?.value;
    return appliesTo !== 'ALL';
  }

  get showDomainFields(): boolean {
    return this.couponForm.get('domainScope')?.value === 'SELECTED';
  }
}

