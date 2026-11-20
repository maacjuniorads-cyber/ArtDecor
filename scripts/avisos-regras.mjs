// Regras dos avisos: o que avisar em cada momento do dia (sem enviar nada).
// Separado do envio para dar para testar com dados de exemplo.

const FUSO = 'America/Sao_Paulo';

/** Data "AAAA-MM-DD" no horário de Brasília, somando `dias`. */
export function diaBR(agora, dias = 0) {
  const d = new Date(agora.getTime() + dias * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

const numero = (p) => `#${String(p.numero).padStart(4, '0')}`;
const primeiroNome = (nome) => (nome ?? 'Cliente').trim().split(/\s+/)[0];
const pecas = (p) => (p.itens ?? []).reduce((s, i) => s + (Number(i.quantidade) || 0), 0);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const nomes = (lista, nomeDe) => {
  const n = lista.map((p) => `${primeiroNome(nomeDe(p.cliente_id))} (${numero(p)})`);
  return n.length <= 3 ? n.join(', ') : `${n.slice(0, 3).join(', ')} e mais ${n.length - 3}`;
};

/**
 * @param {'manha'|'tarde'} momento
 * @param {Array} pedidos  linhas da tabela pedidos (só reservado/rua)
 * @param {Array} clientes linhas {id, nome}
 * @returns {Array<{tipo, title, body, url, tag}>}
 */
export function montarAvisos(momento, pedidos, clientes, agora) {
  const nomeDe = (id) => clientes.find((c) => c.id === id)?.nome;
  const hoje = diaBR(agora);
  const ontem = diaBR(agora, -1);
  const amanha = diaBR(agora, 1);
  const avisos = [];

  if (momento === 'manha') {
    const saem = pedidos.filter((p) => p.status === 'reservado' && p.retirada === hoje);
    const voltam = pedidos.filter((p) => p.status === 'rua' && p.devolucao === hoje);
    const atrasados = pedidos.filter((p) => p.status === 'rua' && p.devolucao < hoje);

    // 1. Resumo do dia (só se tiver algo).
    if (saem.length || voltam.length || atrasados.length) {
      const linhas = [];
      if (saem.length) linhas.push(`${saem.length > 1 ? 'Saem' : 'Sai'} ${plural(saem.length, 'pedido', 'pedidos')}: ${nomes(saem, nomeDe)}.`);
      if (voltam.length) linhas.push(`Volta${voltam.length > 1 ? 'm' : ''} ${plural(voltam.length, 'pedido', 'pedidos')}: ${nomes(voltam, nomeDe)}.`);
      if (atrasados.length) linhas.push(`${plural(atrasados.length, 'devolução atrasada', 'devoluções atrasadas')}: ${nomes(atrasados, nomeDe)}.`);
      avisos.push({ tipo: 'manha', title: 'Bom dia! Hoje na ArtDecor', body: linhas.join('\n'), url: '/agenda', tag: `resumo-${hoje}` });
    }

    // 3. Devolução atrasada: na manhã seguinte ao dia combinado (um aviso por pedido).
    for (const p of pedidos.filter((x) => x.status === 'rua' && x.devolucao === ontem)) {
      avisos.push({
        tipo: 'atraso',
        title: 'Devolução atrasada',
        body: `${primeiroNome(nomeDe(p.cliente_id))} devia ter devolvido o pedido ${numero(p)} ontem. Toque para abrir e mandar um lembrete.`,
        url: `/pedidos/${p.id}`,
        tag: `atraso-${p.id}`,
      });
    }
  }

  if (momento === 'tarde') {
    // 2. Retiradas de amanhã: um aviso por pedido (até 3); mais que isso, um aviso só.
    const amanhaSaem = pedidos.filter((p) => p.status === 'reservado' && p.retirada === amanha).sort((a, b) => a.numero - b.numero);
    if (amanhaSaem.length > 3) {
      avisos.push({
        tipo: 'vespera',
        title: `Amanhã saem ${amanhaSaem.length} pedidos`,
        body: `${nomes(amanhaSaem, nomeDe)} — ${plural(amanhaSaem.reduce((s, p) => s + pecas(p), 0), 'peça', 'peças')} pra separar.`,
        url: '/agenda',
        tag: `vespera-${amanha}`,
      });
    } else {
      for (const p of amanhaSaem) {
        avisos.push({
          tipo: 'vespera',
          title: 'Amanhã tem retirada',
          body: `${primeiroNome(nomeDe(p.cliente_id))} retira o pedido ${numero(p)} amanhã — ${plural(pecas(p), 'peça', 'peças')} pra separar.`,
          url: `/pedidos/${p.id}`,
          tag: `vespera-${p.id}`,
        });
      }
    }
  }

  return avisos;
}
