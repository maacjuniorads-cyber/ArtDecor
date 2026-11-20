# ArtDecor

Aplicativo interno da **ArtDecor**, uma pequena loja de aluguel de decoração para festas e eventos em Jaguarão (RS).

Ele substitui o caderno e as conversas soltas no WhatsApp: mostra o que está em casa, o que está com cliente, o que sai e o que volta em cada dia, e quanto falta receber. Funciona no celular como um app instalado (PWA) e é usado por três pessoas da família, que compartilham os mesmos dados em tempo real.

## O que ele faz

- **Estoque:** peças com foto, categoria, quantidade e valor do aluguel. Mostra quantas estão livres agora.
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
