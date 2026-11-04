export type OrganizationPermissionRole = 'owner' | 'admin' | 'member' | 'viewer' | 'guest'

const rank: Record<OrganizationPermissionRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
  viewer: 0,
  guest: -1,
}

export function canManageMember(
  actor: OrganizationPermissionRole,
  target: OrganizationPermissionRole,
): boolean {
  return rank[actor] >= rank.admin && rank[actor] > rank[target]
}

export function assignableRoles(actor: OrganizationPermissionRole): OrganizationPermissionRole[] {
  return (['admin', 'member', 'viewer', 'guest'] as const).filter((role) =>
    canManageMember(actor, role),
  )
}
