import { useState, useEffect } from 'react';
import { Table, Button, Modal, Select, Avatar, message, Tooltip, Form } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/infrastructure/store/store';
import { getAllUsers, updateUserRole } from '@/application/admin/manageRoles.usecase';
import type { Profile, UserRole } from '@/domain/member/member.types';
import { LoadingScreen } from '@/ui/components/LoadingScreen/LoadingScreen';

import styles from './RolesManagement.module.css';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'receptionist', label: 'Recepcionista' },
  { value: 'member', label: 'Miembro' }
];

const getRoleLabel = (role: UserRole) => {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'receptionist':
      return 'Recepcionista';
    case 'member':
      return 'Miembro';
    default:
      return role;
  }
};

export function RolesManagement() {
  const { profile } = useAppSelector((state) => state.auth);
  const isSuperAdmin = profile?.role === 'super_admin';

  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newRole, setNewRole] = useState<UserRole>('member');

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllUsers();
      setUsers(data);
        } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const handleOpenModal = (user: Profile) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsModalOpen(true);
  };

  const handleCancelModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleSaveRole = () => {
    if (!selectedUser) return;

    if (selectedUser.role === newRole) {
      message.info('El usuario ya tiene asignado este rol.');
      setIsModalOpen(false);
      return;
    }

    Modal.confirm({
      title: '¿Confirmar cambio de rol?',
      content: `¿Cambiar rol de "${selectedUser.full_name}" a "${getRoleLabel(newRole)}"?`,
      okText: 'Confirmar',
      cancelText: 'Cancelar',
      maskClosable: false,
      onOk: async () => {
        setIsSubmitting(true);
        try {
          await updateUserRole(selectedUser.id, newRole);
          message.success(`El rol de ${selectedUser.full_name} se actualizó correctamente.`);
          setIsModalOpen(false);
          setSelectedUser(null);
          await fetchUsers();
        } catch (err: unknown) {
          console.error(err);
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          message.error(msg);
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  if (!isSuperAdmin) {
    return (
      <div className={styles['roles-management__unauthorized']}>
        <h3>Acceso no autorizado</h3>
        <p>Solo los usuarios con rol de Super Administrador pueden acceder a este panel.</p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Cargando usuarios y roles..." />;
  }

  if (error) {
    return (
      <div className={styles['roles-management__error']} role="alert">
        <h3>Error al cargar datos</h3>
        <p>{error}</p>
        <Button type="primary" onClick={fetchUsers}>
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  const columns = [
    {
      title: 'Avatar',
      key: 'avatar',
      width: '10%',
      render: (_: any, record: Profile) => (
        <Avatar
          src={record.avatar_url}
          icon={<UserOutlined />}
          className={styles['roles-management__avatar']}
        >
          {record.full_name ? record.full_name.charAt(0).toUpperCase() : 'U'}
        </Avatar>
      )
    },
    {
      title: 'Nombre',
      dataIndex: 'full_name',
      key: 'full_name',
      width: '30%',
      render: (text: string) => <strong className={styles['roles-management__name']}>{text}</strong>
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: '30%',
    },
    {
      title: 'Rol actual',
      dataIndex: 'role',
      key: 'role',
      width: '15%',
      render: (role: UserRole) => {
        let modifier = '';
        if (role === 'super_admin') modifier = 'super-admin';
        else if (role === 'receptionist') modifier = 'receptionist';
        else if (role === 'member') modifier = 'member';

        return (
          <span className={`${styles['roles-management__badge']} ${styles[`roles-management__badge--${modifier}`]}`}>
            {getRoleLabel(role)}
          </span>
        );
      }
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: '15%',
      render: (_: any, record: Profile) => {
        const isSelf = record.id === profile?.id;
        
        return (
          <Tooltip title={isSelf ? 'No puedes cambiar tu propio rol' : 'Modificar rol del usuario'}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(record)}
              disabled={isSelf}
              className={styles['roles-management__action-btn']}
            >
              Cambiar rol
            </Button>
          </Tooltip>
        );
      }
    }
  ];

  return (
    <div className={styles['roles-management']}>
      {isSubmitting && <LoadingScreen message="Actualizando rol del usuario..." />}

      <header className={styles['roles-management__header']}>
        <h3 className={styles['roles-management__title']}>Gestión de Usuarios y Roles</h3>
        <p className={styles['roles-management__description']}>
          Lista de todos los usuarios registrados en el sistema. Puedes cambiar los roles de los usuarios
          a Super Admin, Recepcionista o Miembro.
        </p>
      </header>

      <div className={styles['roles-management__table-wrapper']}>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="middle"
        />
      </div>

      <Modal
        title="Modificar Rol de Usuario"
        open={isModalOpen}
        onOk={handleSaveRole}
        onCancel={handleCancelModal}
        okText="Guardar"
        cancelText="Cancelar"
        maskClosable={false}
        destroyOnClose
      >
        {selectedUser && (
          <div className={styles['roles-management__modal-form']}>
            <p>
              Estás modificando el rol de: <strong>{selectedUser.full_name}</strong> ({selectedUser.email})
            </p>
            <Form layout="vertical">
              <Form.Item label="Selecciona el nuevo rol">
                <Select
                  value={newRole}
                  onChange={(val) => setNewRole(val as UserRole)}
                  className={styles['roles-management__select']}
                  options={ROLE_OPTIONS}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
export default RolesManagement;

