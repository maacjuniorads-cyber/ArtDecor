import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout, TelaCheiaLayout } from '@/components/AppLayout';
import { ComLogin } from '@/components/Autenticacao';
import { Abertura } from '@/components/Telas';
import { DadosProvider } from '@/data/store';
import { TourProvider } from '@/components/tour/Tour';
import { Inicio } from '@/pages/Inicio';
import { Agenda } from '@/pages/Agenda';
import { Estoque } from '@/pages/Estoque';
import { ItemForm } from '@/pages/ItemForm';
import { TemaForm } from '@/pages/TemaForm';
import { Pedidos } from '@/pages/Pedidos';
import { PedidoDetalhe } from '@/pages/PedidoDetalhe';
import { PedidoForm } from '@/pages/PedidoForm';
import { Conferencia } from '@/pages/Conferencia';
import { Contagem } from '@/pages/Contagem';
import { Nota } from '@/pages/Nota';
import { Clientes } from '@/pages/Clientes';
import { ClienteForm } from '@/pages/ClienteForm';
import { EmBreve } from '@/pages/EmBreve';
import { Backup } from '@/pages/Backup';

export function App() {
  return (
    <>
    <Abertura />
    <ComLogin>
      <DadosProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <TourProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Inicio />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="pedidos" element={<Pedidos />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="*" element={<EmBreve titulo="Página não encontrada" />} />
            </Route>
            <Route element={<TelaCheiaLayout />}>
              <Route path="estoque/novo" element={<ItemForm />} />
              <Route path="estoque/contar" element={<Contagem />} />
              <Route path="estoque/:id" element={<ItemForm />} />
              <Route path="temas/novo" element={<TemaForm />} />
              <Route path="temas/:id" element={<TemaForm />} />
              <Route path="pedidos/novo" element={<PedidoForm />} />
              <Route path="pedidos/:id" element={<PedidoDetalhe />} />
              <Route path="pedidos/:id/editar" element={<PedidoForm />} />
              <Route path="pedidos/:id/nota" element={<Nota />} />
              <Route path="pedidos/:id/conferir" element={<Conferencia />} />
              <Route path="clientes/novo" element={<ClienteForm />} />
              <Route path="clientes/:id" element={<ClienteForm />} />
              <Route path="backup" element={<Backup />} />
            </Route>
          </Routes>
          </TourProvider>
        </BrowserRouter>
      </DadosProvider>
    </ComLogin>
    </>
  );
}
