import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isNavActive, projectGroups, projectInPath, sidebarGroups } from '../navigation.ts'

const labels = (groups: { items: { label: string }[] }[]) =>
  groups.flatMap((group) => group.items.map((item) => item.label))

const main = (guest = false) =>
  sidebarGroups({ projectsPath: '/organizacoes/o1/projetos', projectId: null, guest })

test('a barra da organização não tem mais as telas de um projeto', () => {
  const items = labels(main())
  for (const gone of ['Kanban', 'Tarefas', 'Reuniões', 'Equipe', 'Documentos'])
    assert.ok(!items.includes(gone), `${gone} saiu da barra principal`)
  assert.deepEqual(items.slice(0, 2), ['Dashboard', 'Projetos'])
  assert.ok(items.includes('Mensagens'))
})

test('Projetos leva para a lista de projetos da organização', () => {
  const projects = main()
    .flatMap((group) => group.items)
    .find((item) => item.label === 'Projetos')!
  assert.equal(projects.to, '/organizacoes/o1/projetos')
  assert.ok(isNavActive(projects, '/organizacoes/o1/projetos'))
})

test('dentro de um projeto a barra mostra as telas dele', () => {
  assert.equal(projectInPath('/setores/p1'), 'p1')
  assert.equal(projectInPath('/setores/p1/editar'), 'p1')
  assert.equal(projectInPath('/organizacoes/o1/projetos'), null)
  const items = Object.fromEntries(
    projectGroups('p1')
      .flatMap((group) => group.items)
      .map((item) => [item.label, item]),
  )
  assert.equal(items.Kanban!.to, '/setores/p1')
  assert.equal(items.Lista!.to, '/setores/p1?view=list')
  assert.equal(items.Tabela!.to, '/setores/p1?view=table')
  assert.equal(items['Linha do tempo']!.to, '/setores/p1?view=timeline')
  assert.equal(items.Documentos!.to, '/setores/p1?view=pages')
  assert.equal(items['Configurações']!.to, '/setores/p1/editar')
})

test('só o item da aba aberta do projeto fica ativo', () => {
  const items = projectGroups('p1').flatMap((group) => group.items)
  const active = (path: string, view = '') =>
    items.filter((item) => isNavActive(item, path, view)).map((item) => item.label)
  assert.deepEqual(active('/setores/p1'), ['Kanban'])
  assert.deepEqual(active('/setores/p1', 'table'), ['Tabela'])
  assert.deepEqual(active('/setores/p1', 'pages'), ['Documentos'])
  assert.deepEqual(active('/setores/p1/editar'), ['Configurações'])
})

test('convidado externo vê só os projetos e, dentro deles, sem Configurações', () => {
  assert.deepEqual(labels(main(true)), ['Dashboard', 'Projetos'])
  assert.ok(!labels(projectGroups('p1', { guest: true })).includes('Configurações'))
})
