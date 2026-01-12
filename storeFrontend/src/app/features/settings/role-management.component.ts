import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '@app/core/services/role.service';
import { StoreRole, DomainRole } from '@app/core/models';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h3>Shop-Rollen</h3>
    <ul>
      <li *ngFor="let role of storeRoles$ | async">
        <b>{{ role.role }}</b> (Shop-ID: {{ role.storeId }})<br>
        Berechtigungen: {{ role.permissions.join(', ') }}
        <button (click)="editStoreRole(role)">Bearbeiten</button>
        <button (click)="deleteStoreRole(role)">Löschen</button>
      </li>
    </ul>
    <h3>Domain-Rollen</h3>
    <ul>
      <li *ngFor="let role of domainRoles$ | async">
        <b>{{ role.role }}</b> (Domain-ID: {{ role.domainId }})<br>
        Berechtigungen: {{ role.permissions.join(', ') }}
        <button (click)="editDomainRole(role)">Bearbeiten</button>
        <button (click)="deleteDomainRole(role)">Löschen</button>
      </li>
    </ul>
    <h4>Neue Shop-Rolle hinzufügen</h4>
    <form (ngSubmit)="addStoreRole()">
      <input [(ngModel)]="newStoreRole.role" name="role" placeholder="Rolle" required>
      <input [(ngModel)]="newStoreRole.storeId" name="storeId" type="number" placeholder="Shop-ID" required>
      <input [(ngModel)]="newStoreRole.permissionsStr" name="permissions" placeholder="Berechtigungen (Komma getrennt)" required>
      <button type="submit">Hinzufügen</button>
    </form>
    <h4>Neue Domain-Rolle hinzufügen</h4>
    <form (ngSubmit)="addDomainRole()">
      <input [(ngModel)]="newDomainRole.role" name="domainRole" placeholder="Rolle" required>
      <input [(ngModel)]="newDomainRole.domainId" name="domainId" type="number" placeholder="Domain-ID" required>
      <input [(ngModel)]="newDomainRole.permissionsStr" name="domainPermissions" placeholder="Berechtigungen (Komma getrennt)" required>
      <button type="submit">Hinzufügen</button>
    </form>
  `
})
export class RoleManagementComponent {
  storeRoles$: Observable<StoreRole[]>;
  domainRoles$: Observable<DomainRole[]>;
  userId = 1;

  newStoreRole = { role: '', storeId: 0, permissionsStr: '' };
  newDomainRole = { role: '', domainId: 0, permissionsStr: '' };

  constructor(private roleService: RoleService) {
    this.storeRoles$ = this.roleService.getStoreRoles(this.userId);
    this.domainRoles$ = this.roleService.getDomainRoles(this.userId);
  }

  addStoreRole() {
    const permissions = this.newStoreRole.permissionsStr.split(',').map(p => p.trim());
    const role: StoreRole = {
      userId: this.userId,
      storeId: this.newStoreRole.storeId,
      role: this.newStoreRole.role,
      permissions
    };
    this.roleService.addStoreRole(role).subscribe(() => {
      this.storeRoles$ = this.roleService.getStoreRoles(this.userId);
      this.newStoreRole = { role: '', storeId: 0, permissionsStr: '' };
    });
  }

  addDomainRole() {
    const permissions = this.newDomainRole.permissionsStr.split(',').map(p => p.trim());
    const role: DomainRole = {
      userId: this.userId,
      domainId: this.newDomainRole.domainId,
      role: this.newDomainRole.role,
      permissions
    };
    this.roleService.addDomainRole(role).subscribe(() => {
      this.domainRoles$ = this.roleService.getDomainRoles(this.userId);
      this.newDomainRole = { role: '', domainId: 0, permissionsStr: '' };
    });
  }

  editStoreRole(role: StoreRole) {
    // Hier könnte ein Dialog/Feld zum Bearbeiten erscheinen
  }

  deleteStoreRole(role: StoreRole) {
    this.roleService.removeStoreRole(role.storeId, role.userId).subscribe(() => {
      this.storeRoles$ = this.roleService.getStoreRoles(this.userId);
    });
  }

  editDomainRole(role: DomainRole) {
  }

  deleteDomainRole(role: DomainRole) {
    this.roleService.removeDomainRole(role.domainId, role.userId).subscribe(() => {
      this.domainRoles$ = this.roleService.getDomainRoles(this.userId);
    });
  }
}
