import { createAccessControl } from 'better-auth/plugins/access';

// Menentukan apa saja yang bisa dilakukan (Permissions)
const statement = {
	member: ['create', 'update', 'delete', 'view'],
	inventory: ['create', 'update', 'delete', 'view'],
	report: ['generate', 'view'],
	warehouse: ['create', 'update', 'delete', 'view'],
	movement: ['create', 'update', 'delete', 'view'],
	lending: ['create', 'update', 'delete', 'view', 'approve'],
	maintenance: ['create', 'update', 'delete', 'view'],
	distribution: ['create', 'update', 'delete', 'view', 'validate', 'approve', 'ship', 'receive'],
	infrastructure: ['create', 'update', 'delete', 'view'],
	organization: ['create', 'update', 'delete', 'view'],
	auditLog: ['view']
} as const;

export const accessControl = createAccessControl(statement);

// Secara deklaratif mendefinisikan Role dan kemampuannya
export const superadmin = accessControl.newRole({
	member: ['create', 'update', 'delete', 'view'],
	inventory: ['create', 'update', 'delete', 'view'],
	report: ['generate', 'view'],
	warehouse: ['create', 'update', 'delete', 'view'],
	movement: ['create', 'update', 'delete', 'view'],
	lending: ['create', 'update', 'delete', 'view', 'approve'],
	maintenance: ['create', 'update', 'delete', 'view'],
	distribution: ['create', 'update', 'delete', 'view', 'validate', 'approve', 'ship', 'receive'],
	infrastructure: ['create', 'update', 'delete', 'view'],
	organization: ['create', 'update', 'delete', 'view'],
	auditLog: ['view']
});

export const pimpinan = accessControl.newRole({
	member: ['create', 'view'],
	inventory: ['create', 'update', 'view'],
	report: ['generate', 'view'],
	warehouse: ['view'],
	movement: ['view'],
	lending: ['view', 'approve'],
	maintenance: ['view'],
	distribution: ['view', 'approve'],
	infrastructure: ['view'],
	organization: ['view']
});

export const kakomlek = accessControl.newRole({
	member: ['create', 'view'],
	inventory: ['create', 'update', 'view'],
	report: ['generate', 'view'],
	warehouse: ['view'],
	movement: ['view'],
	lending: ['view', 'approve'],
	maintenance: ['view'],
	distribution: ['view', 'approve'],
	infrastructure: ['view'],
	organization: ['view'],
	auditLog: ['view']
});

export const operatorPusatDanDaerah = accessControl.newRole({
	inventory: ['view'],
	warehouse: ['view'],
	movement: ['create', 'view'],
	report: ['view'],
	lending: ['view'],
	maintenance: ['view'],
	distribution: ['view', 'receive'],
	infrastructure: ['view'],
	organization: ['view']
});

export const operatorBinmatDanBekharrah = accessControl.newRole({
	inventory: ['view'],
	warehouse: ['view'],
	movement: ['create', 'view'],
	report: ['view'],
	lending: ['view'],
	maintenance: ['view'],
	distribution: ['view', 'validate', 'ship', 'receive'],
	infrastructure: ['view'],
	organization: ['view']
});

export const roles = {
	superadmin,
	pimpinan,
	kakomlek,
	operatorPusatDanDaerah,
	operatorBinmatDanBekharrah
};

