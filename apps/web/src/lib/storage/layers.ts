import { getSupabase, supabase } from '@/integrations/supabase/client';

export const LayersStorage = {
  /**
   * Upload de arquivo para layers/custom/user_<uuid>/
   */
  async uploadCustomLayer(file: File, userId: string) {
    const client = getSupabase();
    const path = `custom/user_${userId}/${file.name}`;
    const { data, error } = await client.storage
      .from('layers')
      .upload(path, file, { upsert: true });
    
    if (error) throw error;
    return data;
  },

  /**
   * Listar arquivos do usuário em custom/
   */
  async listUserLayers(userId: string) {
    const client = getSupabase();
    const { data, error } = await client.storage
      .from('layers')
      .list(`custom/user_${userId}/`);
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Download de camada base (IBGE, etc.)
   */
  getBaseLayerUrl(filename: string) {
    const client = getSupabase();
    const { data } = client.storage
      .from('layers')
      .getPublicUrl(`base/${filename}`);
    
    return data.publicUrl;
  },

  /**
   * Deletar arquivo customizado
   */
  async deleteCustomLayer(userId: string, filename: string) {
    const client = getSupabase();
    const path = `custom/user_${userId}/${filename}`;
    const { error } = await client.storage
      .from('layers')
      .remove([path]);
    
    if (error) throw error;
  },

  /**
   * Download URL de arquivo customizado
   */
  getCustomLayerUrl(userId: string, filename: string) {
    const client = getSupabase();
    const { data } = client.storage
      .from('layers')
      .getPublicUrl(`custom/user_${userId}/${filename}`);
    
    return data.publicUrl;
  }
};
