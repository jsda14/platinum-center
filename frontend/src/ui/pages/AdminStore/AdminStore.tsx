import { Table, Button, ConfigProvider, theme } from 'antd';
import { PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { LockedFeature, showUpgradeModal } from '@/ui/components/LockedFeature';
import styles from './AdminStore.module.css';

interface StoreProduct {
  id: string;
  name: string;
  category: 'Suplementos' | 'Ropa';
  price: number;
  stock: number;
  status: 'available' | 'low_stock' | 'out_of_stock';
}

const MOCK_PRODUCTS: StoreProduct[] = [
  {
    id: 'prod-1',
    name: 'Whey Protein 1kg',
    category: 'Suplementos',
    price: 85000,
    stock: 12,
    status: 'available',
  },
  {
    id: 'prod-2',
    name: 'Creatina 300g',
    category: 'Suplementos',
    price: 65000,
    stock: 8,
    status: 'available',
  },
  {
    id: 'prod-3',
    name: 'Camiseta Dry-Fit',
    category: 'Ropa',
    price: 45000,
    stock: 20,
    status: 'available',
  },
  {
    id: 'prod-4',
    name: 'BCAA 200g',
    category: 'Suplementos',
    price: 55000,
    stock: 3,
    status: 'low_stock',
  },
  {
    id: 'prod-5',
    name: 'Licra Deportiva',
    category: 'Ropa',
    price: 75000,
    stock: 0,
    status: 'out_of_stock',
  },
];

export function AdminStore() {
  const columns = [
    {
      title: 'Producto',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span className={styles['admin-store__product-name']}>{name}</span>
      ),
    },
    {
      title: 'Categoría',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => (
        <span className={styles['admin-store__category-tag']}>{cat}</span>
      ),
    },
    {
      title: 'Precio',
      dataIndex: 'price',
      key: 'price',
      render: (val: number) => (
        <span className={styles['admin-store__price']}>
          ${val.toLocaleString('es-CO')}
        </span>
      ),
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: number) => <span>{stock} u.</span>,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: StoreProduct['status']) => {
        if (status === 'available') {
          return (
            <span className={`${styles['admin-store__status']} ${styles['admin-store__status--available']}`}>
              Disponible
            </span>
          );
        }
        if (status === 'low_stock') {
          return (
            <span className={`${styles['admin-store__status']} ${styles['admin-store__status--low-stock']}`}>
              Bajo stock
            </span>
          );
        }
        return (
          <span className={`${styles['admin-store__status']} ${styles['admin-store__status--out-of-stock']}`}>
            Agotado
          </span>
        );
      },
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div className={styles['admin-store']} role="region" aria-label="Tienda e Inventario">
        <LockedFeature.Section
          title="Tienda & Inventario"
          description="Gestione suplementos, bebidas y accesorios deportivos con control de stock en tiempo real e integración automática a los reportes de ingresos mensuales."
          comingSoon={false}
        >
          <div className={styles['admin-store__header']}>
            <div className={styles['admin-store__title-group']}>
              <h1 className={styles['admin-store__title']}>Tienda & Inventario</h1>
              <p className={styles['admin-store__subtitle']}>
                Control de productos, suplementación y merchandising del gimnasio.
              </p>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showUpgradeModal()}
              className={styles['admin-store__add-btn']}
            >
              Agregar producto
            </Button>
          </div>

          <div className={styles['admin-store__table-card']}>
            <Table
              dataSource={MOCK_PRODUCTS}
              columns={columns}
              rowKey="id"
              pagination={false}
              onRow={() => ({
                onClick: () => showUpgradeModal(),
                style: { cursor: 'pointer' },
              })}
            />
          </div>

          <div className={styles['admin-store__banner']}>
            <InfoCircleOutlined className={styles['admin-store__banner-icon']} />
            <span>
              El inventario de la tienda se integra automáticamente en los reportes mensuales de ingresos del gimnasio.
            </span>
          </div>
        </LockedFeature.Section>
      </div>
    </ConfigProvider>
  );
}

export default AdminStore;
