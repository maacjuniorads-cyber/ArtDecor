import { useState, type FormEvent } from 'react';
import { ErroFormulario, useErro } from '@/components/ErroFormulario';
import { AvisoRascunho, useRascunho } from '@/components/Rascunho';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeStatus } from '@/components/Badge';
import { Cabecalho } from '@/components/Cabecalho';
import { Icon } from '@/components/Icon';
import { motivoBloqueio, ZonaExclusao } from '@/components/ZonaExclusao';
import { novoId, useDados } from '@/data/store';
import { deISO, formatarMoeda } from '@/lib/formato';
import { emAndamento, numeroPedido, totalPedido } from '@/lib/pedidos';
import { TIPOS_VEICULO, type TipoVeiculo } from '@/types';
import ui from '@/styles/ui.module.css';
import styles from './ClienteForm.module.css';

export function ClienteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clientes, pedidos, salvarCliente, removerCliente } = useDados();
  const existente = clientes.find((c) => c.id === id && !c.removido);
  const v = existente?.veiculo;

  const [nome, setNome] = useState(existente?.nome ?? '');
  const [telefone, setTelefone] = useState(existente?.telefone ?? '');
  const [whatsIgual, setWhatsIgual] = useState(!existente?.whatsapp);
  const [whatsapp, setWhatsapp] = useState(existente?.whatsapp ?? '');
  const [endereco, setEndereco] = useState(existente?.endereco ?? '');
  // Importado da agenda: ainda não sabemos do carro, então não marca "não tem veículo".
  const [semVeiculo, setSemVeiculo] = useState(existente && !existente.importado ? !v : false);
  const [tipo, setTipo] = useState<TipoVeiculo>(v?.tipo ?? 'Carro');
  const [modelo, setModelo] = useState(v?.modelo ?? '');
  const [cor, setCor] = useState(v?.cor ?? '');
  const [placa, setPlaca] = useState(v?.placa ?? '');
  const [erro, setErro] = useErro();
  const [salvando, setSalvando] = useState(false);

  const rascunho = useRascunho(
    `cliente:${id ?? 'novo'}`,
    { nome, telefone, whatsIgual, whatsapp, endereco, semVeiculo, tipo, modelo, cor, placa },
    (v) => {
      setNome(v.nome);
      setTelefone(v.telefone);
      setWhatsIgual(v.whatsIgual);
      setWhatsapp(v.whatsapp);
      setEndereco(v.endereco);
      setSemVeiculo(v.semVeiculo);
      setTipo(v.tipo);
      setModelo(v.modelo);
      setCor(v.cor);
      setPlaca(v.placa);
    },
  );

  if (id && !existente) {
    return (
      <>
        <Cabecalho titulo="Cliente" voltarPara="/clientes" />
        <p className={ui.vazio}>Cliente não encontrado.</p>
      </>
    );
  }

  const pedidosDoCliente = existente
    ? pedidos.filter((p) => p.clienteId === existente.id).sort((a, b) => b.retirada.localeCompare(a.retirada))
    : [];

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (salvando) return;
    if (!nome.trim()) return setErro('Informe o nome.');
    if (telefone.replace(/\D/g, '').length < 10) return setErro('Informe o telefone com DDD.');
    if (!semVeiculo && !modelo.trim()) return setErro('Informe o modelo do veículo ou marque "Cliente não tem veículo".');
    setSalvando(true);
    const ok = await salvarCliente({
      id: existente?.id ?? novoId(),
      nome: nome.trim(),
      telefone: telefone.trim(),
      whatsapp: whatsIgual ? undefined : whatsapp.trim() || undefined,
      endereco: endereco.trim() || undefined,
      veiculo: semVeiculo ? null : { tipo, modelo: modelo.trim(), cor: cor.trim(), placa: placa.trim().toUpperCase() },
    });
    setSalvando(false);
    if (ok) {
      rascunho.limpar();
      navigate(-1);
    }
  }

  return (
    <>
      <Cabecalho titulo={existente ? 'Editar cliente' : 'Novo cliente'} voltarPara="/clientes" />
      <form id="form-cliente" className={ui.form} onSubmit={salvar} noValidate>
        <AvisoRascunho visivel={rascunho.recuperado} onDescartar={rascunho.descartar} />
        {existente?.importado && (
          <p className={styles.importado}>
            Veio da agenda do celular, só com nome e telefone. Complete o <b>endereço</b> e o <b>carro</b> (ou marque que não tem) e salve.
          </p>
        )}
        <label className={ui.campo}>
          <span className={ui.rotulo}>Nome</span>
          <input className={ui.input} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" autoComplete="off" />
        </label>

        <label className={ui.campo}>
          <span className={ui.rotulo}>Telefone</span>
          <input className={ui.input} type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(53) 9____-____" autoComplete="off" />
        </label>
        <label className={ui.marcar} style={{ marginTop: -8 }}>
          <input type="checkbox" checked={whatsIgual} onChange={(e) => setWhatsIgual(e.target.checked)} />
          WhatsApp é o mesmo número
        </label>
        {!whatsIgual && (
          <label className={ui.campo}>
            <span className={ui.rotulo}>WhatsApp</span>
            <input className={ui.input} type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(53) 9____-____" autoComplete="off" />
          </label>
        )}

        <label className={ui.campo}>
          <span className={ui.rotulo}>Endereço</span>
          <input className={ui.input} value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade" autoComplete="off" />
        </label>

        <h2 className={ui.subtitulo}>
          <Icon name="veiculo" size={22} />
          Veículo
        </h2>
        <p className={ui.detalhe} style={{ margin: '-12px 0 0' }}>
          Pra reconhecer quem chegou na porta.
        </p>
        <label className={ui.marcar} style={{ marginTop: -8 }}>
          <input type="checkbox" checked={semVeiculo} onChange={(e) => setSemVeiculo(e.target.checked)} />
          Cliente não tem veículo
        </label>
        {!semVeiculo && (
          <>
            <label className={ui.campo}>
              <span className={ui.rotulo}>Tipo</span>
              <select className={ui.input} value={tipo} onChange={(e) => setTipo(e.target.value as TipoVeiculo)}>
                {TIPOS_VEICULO.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <div className={ui.grade2}>
              <label className={ui.campo}>
                <span className={ui.rotulo}>Modelo</span>
                <input className={ui.input} value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ex: Onix" autoComplete="off" />
              </label>
              <label className={ui.campo}>
                <span className={ui.rotulo}>Cor</span>
                <input className={ui.input} value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Ex: prata" autoComplete="off" />
              </label>
            </div>
            <label className={ui.campo}>
              <span className={ui.rotulo}>Placa (opcional)</span>
              <input
                className={ui.input}
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="ABC1D23"
                autoComplete="off"
                style={{ letterSpacing: '0.1em' }}
              />
            </label>
          </>
        )}

        {existente && (
          <section>
            <h2 className={ui.secao}>Pedidos ({pedidosDoCliente.length})</h2>
            {pedidosDoCliente.length === 0 ? (
              <p className={ui.vazio}>Nenhum pedido ainda.</p>
            ) : (
              <ul className={ui.lista}>
                {pedidosDoCliente.map((p) => (
                  <li key={p.id}>
                    <Link to={`/pedidos/${p.id}`} className={ui.linhaCartao}>
                      <span className={ui.texto}>
                        <span className={ui.nome}>
                          {numeroPedido(p)} · {deISO(p.retirada).toLocaleDateString('pt-BR')}
                        </span>
                        <span className={ui.detalhe}>{formatarMoeda(totalPedido(p))}</span>
                      </span>
                      <BadgeStatus status={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <ErroFormulario erro={erro} onFechar={() => setErro('')} />

        {existente && (
          <ZonaExclusao
            rotulo="Excluir cliente"
            confirmacao={`Excluir ${existente.nome}? O cadastro some da lista, mas continua aparecendo nos pedidos antigos.`}
            bloqueio={motivoBloqueio(pedidosDoCliente.filter(emAndamento).map(numeroPedido), 'este cliente')}
            onConfirmar={async () => {
              if (await removerCliente(existente.id)) {
                rascunho.limpar();
                navigate('/clientes', { replace: true });
              }
            }}
          />
        )}
      </form>

      <div className={ui.barraAcao}>
        <button type="submit" form="form-cliente" className={ui.botaoPrimario} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar cliente'}
        </button>
      </div>
    </>
  );
}
