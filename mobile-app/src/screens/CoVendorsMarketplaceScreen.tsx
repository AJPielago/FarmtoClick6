import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { productsAPI, cartAPI, API_BASE_URL } from '../services/api';
import { useNavigation } from '@react-navigation/native';

const categories = [
  'Vegetables', 'Fruits', 'Grains', 'Dairy', 'Baked Goods', 'Beverages', 'Other'
];

const sortOptions = ['newest', 'price_low', 'price_high', 'name_asc', 'name_desc'];

const CoVendorsMarketplaceScreen: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(true);
  const navigation = useNavigation();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await productsAPI.getCovendors();
      const list = res.data?.products || res.data || [];
      setProducts(list);
    } catch (err) {
      console.error('Failed to load covendors', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let out = [...products];
    if (selectedCategory) {
      out = out.filter(p => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      out = out.filter(p => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    if (minPrice) {
      const m = parseFloat(minPrice) || 0;
      out = out.filter(p => (parseFloat(p.price) || 0) >= m);
    }
    if (maxPrice) {
      const m = parseFloat(maxPrice) || 0;
      out = out.filter(p => (parseFloat(p.price) || 0) <= m);
    }
    if (sortBy === 'price_low') out.sort((a,b) => (parseFloat(a.price)||0) - (parseFloat(b.price)||0));
    else if (sortBy === 'price_high') out.sort((a,b) => (parseFloat(b.price)||0) - (parseFloat(a.price)||0));
    else if (sortBy === 'name_asc') out.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    else if (sortBy === 'name_desc') out.sort((a,b) => (b.name||'').localeCompare(a.name||''));
    else out.sort((a,b) => new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime());
    setFiltered(out);
  }, [products, searchQuery, selectedCategory, minPrice, maxPrice, sortBy]);

  const onAddToCart = async (productId: string, productName?: string) => {
    try {
      await cartAPI.addToCart(productId, 1);
      Alert.alert('Added', `${productName || 'Item'} added to cart`);
    } catch (err) {
      console.error('Add to cart failed', err);
      Alert.alert('Error', 'Failed to add to cart. Check your connection.');
    }
  };

  const resolveImage = (product: any) => {
    const val = product.image_url || product.image || '';
    if (!val) return null;
    if (val.startsWith('http') || val.startsWith('/')) return val.startsWith('http') ? val : `${API_BASE_URL}${val}`;
    return `${API_BASE_URL}/static/uploads/products/${val}`;
  };

  const safeText = (v: any) => (v === null || v === undefined ? '' : String(v));

  return (
    <View style={styles.container}>
      <ScrollView style={styles.header} contentContainerStyle={{ paddingBottom: 12 }}>
        <Text style={styles.title}>🏪 Vendors Marketplace</Text>
        <Text style={styles.note}><Text style={{fontWeight:'600'}}>Note:</Text> Prices suggested from DTI use a 15% markup in the Vendors Marketplace.</Text>

        <View style={styles.filterBox}>
          <View style={styles.filterHeaderRow}>
            <Text style={styles.filterTitle}>🔎 Search & Filter</Text>
            <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterToggle}>
              <Text style={styles.filterToggleText}>{showFilters ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          {showFilters && (<>
            <View style={styles.filterRowTop}>
              <TextInput
                placeholder="Search products..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.input}
              />
            </View>

            <View style={styles.filterRow}>
              <TextInput
                placeholder="Min"
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
                style={[styles.smallInput]}
              />
              <TextInput
                placeholder="Max"
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
                style={[styles.smallInput]}
              />

              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => {
                  const idx = sortOptions.indexOf(sortBy);
                  setSortBy(sortOptions[(idx + 1) % sortOptions.length]);
                }}
              >
                <Text style={styles.sortText}>Sort: {sortBy.replace('_', ' ')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chipsRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.chip, !selectedCategory && styles.chipActive]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All</Text>
                </TouchableOpacity>
                {categories.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, selectedCategory === c && styles.chipActive]}
                    onPress={() => setSelectedCategory(selectedCategory === c ? null : c)}
                  >
                    <Text style={[styles.chipText, selectedCategory === c && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>)}
        </View>
      </ScrollView>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color="#4CAF50" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id || i._id || i.name}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                {resolveImage(item) ? (
                  <Image source={{ uri: resolveImage(item) as string }} style={styles.productImage} />
                ) : (
                  <View style={styles.placeholder}><Text style={{fontSize:24,color:'#9AA'}}>🌿</Text></View>
                )}
                {item.category ? <View style={styles.badge}><Text style={styles.badgeText}>{item.category}</Text></View> : null}
              </View>

              <View style={styles.cardRight}>
                <Text style={styles.name}>{safeText(item.name)}</Text>
                <Text style={styles.farmer}>by <Text style={{color:'#4CAF50'}}>{safeText(item.farmer_name || item.farmer?.farm_name || item.farmer?.name || 'Unknown')}</Text></Text>
                <Text style={styles.desc}>{safeText((item.description || '').length > 120 ? (item.description || '').substring(0,120) + '...' : (item.description || 'Fresh produce, directly from the farm.'))}</Text>

                <View style={styles.metaRow}>
                  <Text style={styles.price}>₱{safeText(((parseFloat(item.price)||0).toFixed(2)))}/{safeText(item.unit || 'unit')}</Text>
                  <Text style={[styles.qty, {color: (item.quantity||0) < 20 ? '#ff6b6b' : '#4CAF50'}]}>{safeText(item.quantity||0)} {safeText(item.unit||'unit')}</Text>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.viewBtn} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
                    <Text style={styles.viewBtnText}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cartBtn} onPress={() => onAddToCart(item.id || item._id, item.name)}>
                    <Text style={styles.cartBtnText}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}><Text style={styles.emptyTitle}>No Products Found</Text><Text style={styles.emptyText}>There are no vendor products available at the moment.</Text></View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor:'#fff', paddingHorizontal:12, paddingTop:12 },
  title: { fontSize:20, fontWeight:'700', marginBottom:4 },
  note: { color:'#6b7280', marginBottom:8 },
  filterBox: { backgroundColor:'#fff', padding:12, borderRadius:8, borderWidth:1, borderColor:'#e5e7eb', marginBottom:12 },
  filterTitle: { fontSize:16, fontWeight:'600', marginBottom:8 },
  filterRowTop: { flexDirection:'row', alignItems:'center', marginBottom:8 },
  filterRow: { flexDirection:'row', alignItems:'center', marginBottom:8, flexWrap:'wrap' },
  input: { flex:1, padding:10, borderWidth:1, borderColor:'#ddd', borderRadius:6, backgroundColor:'#fff', marginRight:8 },
  smallInput: { width:100, padding:10, borderWidth:1, borderColor:'#ddd', borderRadius:6, backgroundColor:'#fff', marginRight:8 },
  chip: { paddingVertical:6, paddingHorizontal:12, borderRadius:20, backgroundColor:'#fff', borderWidth:1, borderColor:'#ddd', marginRight:8 },
  chipActive: { backgroundColor:'#4CAF50', borderColor:'#4CAF50' },
  chipText: { color:'#333' },
  chipTextActive: { color:'#fff' },
  filterHeaderRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  filterToggle: { paddingHorizontal:8, paddingVertical:4 },
  filterToggleText: { color:'#4CAF50', fontWeight:'600' },
  chipsRow: { marginTop:4 },
  sortButton: { padding:8, borderRadius:6, borderWidth:1, borderColor:'#ddd', backgroundColor:'#fff' },
  sortText: { color:'#333' },
  loading: { flex:1, justifyContent:'center', alignItems:'center' },
  card: { flexDirection:'row', backgroundColor:'#fff', borderRadius:8, padding:10, marginBottom:12, overflow:'hidden' },
  cardLeft: { width:110, marginRight:12, alignItems:'center' },
  productImage: { width:100, height:100, borderRadius:8 },
  placeholder: { width:100, height:100, borderRadius:8, backgroundColor:'#f3f4f6', justifyContent:'center', alignItems:'center' },
  badge: { position:'absolute', top:6, left:6, backgroundColor:'#fff', paddingHorizontal:6, paddingVertical:3, borderRadius:6, borderWidth:1, borderColor:'#e5e7eb' },
  badgeText: { fontSize:11, color:'#333' },
  cardRight: { flex:1 },
  name: { fontWeight:'700', fontSize:16 },
  farmer: { color:'#666', marginTop:4, marginBottom:6 },
  desc: { color:'#666', fontSize:13, marginBottom:8 },
  metaRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  price: { color:'#4CAF50', fontWeight:'700' },
  qty: { color:'#666' },
  actionsRow: { flexDirection:'row', justifyContent:'flex-end', flexWrap:'wrap' },
  viewBtn: { paddingVertical:8, paddingHorizontal:12, borderRadius:6, borderWidth:1, borderColor:'#ddd', backgroundColor:'#fff', marginRight:8, flex:1 },
  viewBtnText: { color:'#333', textAlign:'center' },
  cartBtn: { paddingVertical:8, paddingHorizontal:12, borderRadius:6, backgroundColor:'#4CAF50', flex:1 },
  cartBtnText: { color:'#fff', fontWeight:'700', textAlign:'center' },
  empty: { padding:40, alignItems:'center' },
  emptyTitle: { fontSize:18, fontWeight:'700', color:'#666', marginBottom:8 },
  emptyText: { color:'#999' },
});

export default CoVendorsMarketplaceScreen;
