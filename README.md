# ArtDecor

Aplicativo interno da **ArtDecor**, uma loja de aluguel de decoração para festas e eventos em Jaguarão (RS).

Ele substitui o caderno e as conversas soltas no WhatsApp: mostra o que está em casa, o que está com cliente, o que sai e o que volta em cada dia, e quanto falta receber. Funciona no celular como um app instalado (PWA) e é usado por três pessoas da família, que compartilham os mesmos dados em tempo real.

## O que ele faz

- **Estoque:** peças com foto, categoria, quantidade e valor do aluguel. Mostra quantas estão livres agora.
- **Contagem rápida:** completa o estoque passando pelas peças sem contagem uma de cada vez (foto, quantidade, valor e a próxima).
- **Temas (kits):** as peças que saem juntas, como o painel, as capas de cilindro e os enfeites de um tema. No pedido, um toque coloca o kit inteiro.
- **Clientes:** nome, telefone e endereço. Também guarda o veículo (modelo, cor e placa), porque muitas vezes é pelo carro que se reconhece quem chegou.
- **Pedidos:** passam por *reservado → na rua → devolvido*. Têm sinal e pagamentos (Pix, dinheiro ou cartão), edição, cancelamento e reativação.
- **Aviso de conflito:** avisa quando uma peça já está reservada em outro pedido com datas que se cruzam.
- **Agenda:** calendário do mês com as retiradas e devoluções de cada dia.
- **Conferência da devolução:** confere peça por peça e registra o que voltou estragado ou faltando. Dá pra cobrar o cliente e tirar a peça do estoque.
- **Nota de locação em PDF:** é enviada ao cliente pelo WhatsApp junto com um resumo do pedido.
- **Lembretes pelo WhatsApp:** mensagens prontas de retirada e de devolução. Elas avisam que são automáticas e cumprimentam conforme o horário.
- **Tutorial guiado:** passa por todas as telas usando dados de exemplo, que nunca são gravados.
- **Cópia de segurança:** uma cópia criptografada é feita todo dia, e também dá pra exportar planilhas pelo próprio app.

## Como é feito

| Parte | Tecnologia |
|---|---|
| Interface | React 19, TypeScript, Vite e CSS Modules |
| Dados e login | [Supabase](https://supabase.com): Postgres com RLS, Auth, Realtime e Storage para as fotos |
| Hospedagem | Vercel, que publica sozinha a cada push na `main` |
| PDF | html2canvas e jsPDF, gerados no próprio celular |
| Backup | GitHub Actions, uma vez por dia (veja [docs/BACKUP.md](docs/BACKUP.md)) |

Só usuários cadastrados entram, porque o cadastro público fica desligado. Todas as tabelas exigem login.

## Capacidade

O projeto roda no **plano gratuito** do Supabase. Os limites dele, comparados com o uso medido em 20/11/2026:

| Recurso | Limite (plano gratuito) | Uso em 20/11/2026 | Quanto cabe, na prática |
|---|---|---|---|
| Dados (peças, temas, clientes, pedidos) | 500 MB | 160 kB (66 peças, 13 temas, 1 cliente) | ~2 kB por registro, ou seja, **mais de 200 mil registros** |
| Fotos das peças | 1 GB | 83 kB (2 fotos) | ~100 kB por foto (800 px), ou seja, **cerca de 10 mil fotos** |
| Tráfego para os celulares | 5 GB por mês | baixo | as fotos ficam em cache no aparelho depois da primeira vez |

Exemplo: 5 mil peças, 3 mil clientes e 20 mil pedidos ocupariam menos de 15% do espaço de dados.

Pontos de atenção:

- **Pausa por inatividade:** projetos gratuitos são pausados depois de 7 dias sem acesso. Isso não acontece aqui porque o backup diário e os avisos (duas vezes por dia) acessam o banco todo dia.
- **Velocidade antes de espaço:** o app baixa todas as tabelas ao abrir. Com alguns milhares de pedidos, vale passar a carregar só os pedidos recentes e os em andamento, e buscar os antigos sob demanda.
- **Se passar do limite:** o plano Pro do Supabase (US$ 25 por mês) sobe para 8 GB de dados e 100 GB de arquivos.

Os limites são os do plano gratuito em novembro de 2026; confira em [supabase.com/pricing](https://supabase.com/pricing).

## Rodando no computador

```bash
npm install
cp .env.example .env.local   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_KEY
npm run dev                  # app normal, com login e banco
npm run demo                 # modo demonstração: dados fictícios, sem login (só local)
```

O banco é criado com [supabase/schema.sql](supabase/schema.sql). As mudanças posteriores ficam nos arquivos `supabase/migracao-*.sql`.

## Documentação

- [Guia do aplicativo (PDF)](docs/Guia-ArtDecor.pdf): passo a passo para quem usa o app, com prints de todas as telas. Para atualizar os prints, veja [docs/guia-fonte/](docs/guia-fonte/).
- [Cópia de segurança](docs/BACKUP.md): como funciona e como restaurar.
