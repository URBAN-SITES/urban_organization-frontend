import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isNavActive, sidebarGroups } from '../navigation.ts'

const items = (projectId: string | null) =>
  Object.fromEntries(
    sidebarGroups({ projectsPath: '/organizacoes/o1/projetos', projectId })
      .flatMap((group) => group.items)
      .map((item) => [item.label, item]),
  )

test('itens de projeto abrem a aba certa do projeto em contexto', () => {
  const nav = items('p1')
  assert.equal(nav.Kanban!.to, '/setores/p1')
  assert.equal(nav.Tarefas!.to, '/setores/p1?view=list')
  assert.equal(nav['Reuniões']!.to, '/setores/p1?view=meetings')
})

test('sem projeto, os itens de projeto levam para a lista de projetos', () => {
  const nav = items(null)
  for (const label of ['Kanban', 'Tarefas', 'Reuniões'])
    assert.equal(nav[label]!.to, '/organizacoes/o1/projetos')
})

test('só o item da aba aberta fica ativo', () => {
  const nav = items('p1')
  const active = (path: string, view = '') =>
    Object.values(nav)
      .filter((item) => isNavActive(item, path, view))
      .map((item) => item.label)
  assert.deepEqual(active('/setores/p1'), ['Kanban'])
  assert.deepEqual(active('/setores/p1', 'table'), ['Tarefas'])
  assert.deepEqual(active('/setores/p1', 'meetings'), ['Reuniões'])
  assert.deepEqual(active('/setores/p1', 'github'), [])
  assert.deepEqual(active('/reunioes/m1'), ['Reuniões'])
  assert.deepEqual(active('/'), ['Dashboard'])
  assert.deepEqual(active('/organizacoes/o1/projetos'), ['Projetos'])
  assert.deepEqual(active('/organizacoes/o1/membros'), ['Equipe'])
})
