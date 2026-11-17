// client/src/context/CategoriesContext.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🗂️ CATEGORIAS DA LOJA — vêm do admin (/seller/categorias) via API
// ─────────────────────────────────────────────────────────────────────
// Expõe `groups` (categorias) e `categories` (subcategorias) no MESMO
// formato que antes vinha de assets/assets.js, para os componentes só
// trocarem o import por useCategories().
//
// Primeira pintura: usa a última lista guardada no browser ou, na 1ª
// visita, a lista original do código (assets.js) — assim o menu nunca
// aparece vazio. Logo a seguir a API substitui pela lista do admin.
// ═══════════════════════════════════════════════════════════════════════
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAppContext } from './AppContext';
import {
  groups as staticGroups,
  categories as staticCategories,
  filterDefinitions,
  AVAILABLE_TAGS,
} from '../assets/assets';
import { setSearchCategories } from '../utils/productSearch';

const STORAGE_KEY = 'store_categories_v1';

// Imagem padrão do card por slug (as que já existiam no código)
const STATIC_IMAGES = Object.fromEntries(
  staticGroups.map(g => [g.slug, g.image]),
);

const withFallbackImage = group => ({
  ...group,
  image: group.image || STATIC_IMAGES[group.slug] || '',
});

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.groups) && Array.isArray(parsed?.categories)) {
      return parsed;
    }
  } catch {
    /* storage indisponível */
  }
  return null;
};

const writeStored = data => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage indisponível */
  }
};

const initialData = () =>
  readStored() || {
    groups: staticGroups.map(g => ({
      ...g,
      filterSet: g.isTagGroup ? '' : g.slug,
      showOnHome: !g.isTagGroup,
    })),
    categories: staticCategories,
  };

// Helpers comuns (loja e admin) sobre { groups, categories }
const buildHelpers = (groups, categories) => {
  const getCategoriesByGroup = groupSlug =>
    categories.filter(cat => cat.group === groupSlug);

  const getGroupBySlug = slug => groups.find(g => g.slug === slug);

  const getGroupsWithCategories = () =>
    groups.filter(group => categories.some(cat => cat.group === group.slug));

  // Chave do conjunto de filtros da coleção (sobrevive a mudanças de slug)
  const getFilterSetKey = groupSlug => {
    const group = getGroupBySlug(groupSlug);
    return (group && group.filterSet) || groupSlug;
  };

  const getFiltersByGroup = groupSlug =>
    filterDefinitions[getFilterSetKey(groupSlug)] || [];

  const getCategoryByPath = path =>
    categories.find(
      c => String(c.path).toLowerCase() === String(path || '').toLowerCase(),
    );

  // Tags do cadastro de produto: as fixas + as das coleções por tag
  // criadas no admin (ex: uma coleção "Wetsuits" com a tag "wetsuit")
  const availableTags = [
    ...AVAILABLE_TAGS,
    ...groups
      .filter(
        g => g.isTagGroup && g.tagKey && !AVAILABLE_TAGS.some(t => t.value === g.tagKey),
      )
      .map(g => ({
        value: g.tagKey,
        label: g.name,
        icon: '🏷️',
        description: `Aparece na coleção ${g.name}`,
      })),
  ];

  return {
    groups,
    categories,
    availableTags,
    getCategoriesByGroup,
    getGroupBySlug,
    getGroupsWithCategories,
    getFilterSetKey,
    getFiltersByGroup,
    getCategoryByPath,
  };
};

// Lista crua do admin (GET /api/seller/categories) → formato da loja
export const adminDocsToShape = docs => {
  const roots = docs
    .filter(d => !d.parent)
    .sort((a, b) => a.order - b.order);
  const groups = roots.map(g =>
    withFallbackImage({
      _id: g._id,
      id: g.slug,
      name: g.name,
      slug: g.slug,
      description: g.description || '',
      image: g.image || '',
      isTagGroup: !!g.isTagGroup,
      tagKey: g.tagKey || '',
      filterSet: g.filterSet || '',
      showOnHome: g.showOnHome !== false,
      isActive: g.isActive !== false,
    }),
  );
  const categories = [];
  roots.forEach(g => {
    docs
      .filter(d => d.parent && String(d.parent) === String(g._id))
      .sort((a, b) => a.order - b.order)
      .forEach(c =>
        categories.push({
          _id: c._id,
          text: c.name,
          path: c.slug,
          group: g.slug,
          isActive: c.isActive !== false && g.isActive !== false,
        }),
      );
  });
  return { groups, categories };
};

const CategoriesContext = createContext(null);

export const CategoriesProvider = ({ children }) => {
  const { axios } = useAppContext();
  const [data, setData] = useState(initialData);
  const [loaded, setLoaded] = useState(false);

  const refreshCategories = useCallback(
    async ({ fresh = false } = {}) => {
      try {
        const { data: res } = await axios.get(
          `/api/category${fresh ? `?fresh=${Date.now()}` : ''}`,
        );
        if (res?.success && Array.isArray(res.groups) && res.groups.length) {
          const next = { groups: res.groups, categories: res.categories || [] };
          setData(next);
          writeStored(next);
        }
      } catch (error) {
        console.error('Erro ao carregar categorias:', error.message);
      } finally {
        setLoaded(true);
      }
    },
    [axios],
  );

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  const value = useMemo(() => {
    const groups = data.groups.map(withFallbackImage);
    const categories = data.categories;

    // A busca de produtos (util fora do React) usa as mesmas categorias
    setSearchCategories(groups, categories);

    return {
      ...buildHelpers(groups, categories),
      loaded,
      refreshCategories,
    };
  }, [data, loaded, refreshCategories]);

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategories = () => {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error('useCategories precisa estar dentro de <CategoriesProvider>');
  }
  return ctx;
};

// ═══════════════════════════════════════════════════════════════════════
// 🔐 ADMIN — inclui categorias ocultas (isActive: false), para os
// formulários de produto, a lista de produtos e os cupons. Enquanto a lista
// do admin não chega, usa a da loja.
// ═══════════════════════════════════════════════════════════════════════
export const useAdminCategories = () => {
  const { axios } = useAppContext();
  const store = useCategories();
  const [adminData, setAdminData] = useState(null);

  useEffect(() => {
    let alive = true;
    axios
      .get('/api/seller/categories')
      .then(({ data }) => {
        if (alive && data?.success && Array.isArray(data.categories)) {
          setAdminData(adminDocsToShape(data.categories));
        }
      })
      .catch(error =>
        console.error('Erro ao carregar categorias (admin):', error.message),
      );
    return () => {
      alive = false;
    };
  }, [axios]);

  return useMemo(() => {
    if (!adminData) return store;
    return {
      ...buildHelpers(adminData.groups, adminData.categories),
      loaded: true,
      refreshCategories: store.refreshCategories,
    };
  }, [adminData, store]);
};
