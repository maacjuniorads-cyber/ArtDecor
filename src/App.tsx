import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout, TelaCheiaLayout } from '@/components/AppLayout';
import { DadosProvider } from '@/data/store';
import { Inicio } from '@/pages/Inicio';
import { Estoque } from '@/pages/Estoque';
import { ItemForm } from '@/pages/ItemForm';
import { TemaForm } from '@/pages/TemaForm';
import { Pedidos } from '@/pages/Pedidos';
import { PedidoDetalhe } from '@/pages/PedidoDetalhe';
import { NovoPedido } from '@/pages/NovoPedido';
import { Nota } from '@/pages/Nota';
import { Clientes } from '@/pages/Clientes';
import { ClienteForm } from '@/pages/ClienteForm';
import { EmBreve } from '@/pages/EmBreve';

export function App() {
  return (
    <DadosProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Inicio />} />
            <Route path="estoque" element={<Estoque />} />
            <Route path="pedidos" element={<Pedidos />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="*" element={<EmBreve titulo="Página não encontrada" />} />
          </Route>
          <Route element={<TelaCheiaLayout />}>
            <Route path="estoque/novo" element={<ItemForm />} />
            <Route path="estoque/:id" element={<ItemForm />} />
            <Route path="temas/novo" element={<TemaForm />} />
            <Route path="temas/:id" element={<TemaForm />} />
            <Route path="pedidos/novo" element={<NovoPedido />} />
            <Route path="pedidos/:id" element={<PedidoDetalhe />} />
            <Route path="pedidos/:id/nota" element={<Nota />} />
            <Route path="clientes/novo" element={<ClienteForm />} />
            <Route path="clientes/:id" element={<ClienteForm />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DadosProvider>
  );
}
