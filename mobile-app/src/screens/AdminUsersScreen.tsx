import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../services/api';
import { User } from '../types';

const AdminUsersScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data?.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleRoleChange = (userId: string, currentRole: string) => {
    Alert.alert(
      'Change Role',
      `Current role: ${currentRole}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Make Admin', onPress: () => updateRole(userId, 'admin') },
        { text: 'Make User', onPress: () => updateRole(userId, 'user') },
        { text: 'Make Rider', onPress: () => updateRole(userId, 'rider') },
      ]
    );
  };

  const updateRole = async (userId: string, newRole: string) => {
    try {
      await adminAPI.updateUserRole(userId, newRole);
      Alert.alert('Success', `User role updated to ${newRole}`);
      loadUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
      Alert.alert('Error', 'Failed to update user role');
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.first_name} {item.last_name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{item.role || 'user'}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => handleRoleChange(item.id, item.role || 'user')}
      >
        <Ionicons name="create-outline" size={20} color="#4CAF50" />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No users found.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  roleBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  roleText: {
    color: '#2e7d32',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  editButton: {
    padding: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 16,
  },
});

export default AdminUsersScreen;
