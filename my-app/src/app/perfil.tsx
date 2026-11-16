import { useEffect, useState } from 'react';
import {
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEstadoNotificacoes } from '../hooks/useNotificacoes';
import { agendarNotificacaoDeTeste, definirNotificacoes, sincronizarNotificacoes } from '../services/notificacoes';

const CHAVE_NOME = '@planeja-sua-fome:nome';

export default function PerfilScreen() {
  const notificacoes = useEstadoNotificacoes();
  const [mensagemNotificacao, setMensagemNotificacao] = useState('');
  const [nome, setNome] = useState('');
  const [nomeSalvo, setNomeSalvo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [mensagemDeSucesso, setMensagemDeSucesso] = useState(false);

  useEffect(() => {
    async function carregarNome() {
      try {
        const nomeArmazenado = await AsyncStorage.getItem(CHAVE_NOME);

        if (nomeArmazenado) {
          setNome(nomeArmazenado);
          setNomeSalvo(nomeArmazenado);
        }
      } catch {
        setMensagem('Não foi possível recuperar seu nome. Tente novamente.');
        setMensagemDeSucesso(false);
      }
    }

    carregarNome();
  }, []);

  async function salvarNome() {
    const nomeFormatado = nome.trim();

    if (!nomeFormatado) {
      setMensagem('Informe seu nome antes de salvar.');
      setMensagemDeSucesso(false);
      return;
    }

    try {
      await AsyncStorage.setItem(CHAVE_NOME, nomeFormatado);
      setNome(nomeFormatado);
      setNomeSalvo(nomeFormatado);
      setMensagem('Perfil atualizado com sucesso.');
      setMensagemDeSucesso(true);
      Keyboard.dismiss();
    } catch {
      setMensagem('Não foi possível salvar seu nome. Tente novamente.');
      setMensagemDeSucesso(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Meu perfil</Text>
        <View style={styles.avatar} accessibilityLabel="Ícone de perfil">
          <View style={styles.cabecaAvatar} />
          <View style={styles.corpoAvatar} />
        </View>
      </View>

      <View style={styles.cartao}>
        <Text style={styles.tituloCartao}>Seu nome</Text>
        <Text style={styles.descricao}>
          Informe seu nome para personalizar sua experiência.
        </Text>

        <TextInput
          style={styles.campo}
          value={nome}
          onChangeText={(texto) => {
            setNome(texto);
            setMensagem('');
          }}
          placeholder="Digite seu nome"
          placeholderTextColor="#929A96"
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={salvarNome}
          accessibilityLabel="Seu nome"
        />

        <Pressable
          style={({ pressed }) => [styles.botao, pressed && styles.botaoPressionado]}
          onPress={salvarNome}
          accessibilityRole="button"
        >
          <Text style={styles.textoBotao}>Salvar</Text>
        </Pressable>

        {mensagem ? (
          <Text
            style={[
              styles.mensagem,
              mensagemDeSucesso ? styles.mensagemSucesso : styles.mensagemErro,
            ]}
            accessibilityLiveRegion="polite"
          >
            {mensagem}
          </Text>
        ) : null}

        {nomeSalvo ? (
          <View style={styles.saudaContainer}>
            <Text style={styles.rotuloSaudacao}>SEU PERFIL</Text>
            <Text style={styles.saudacao}>Olá, {nomeSalvo}!</Text>
            <Text style={styles.descricaoSaudacao}>
              Que bom ter você por aqui.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cartao}>
        <Text style={styles.tituloCartao}>Notificações</Text>
        <View style={styles.linhaNotificacao}>
          <Text style={styles.rotuloNotificacao}>Lembrete diário às 7h</Text>
          <Switch
            value={notificacoes.habilitado}
            disabled={!notificacoes.disponivel || !notificacoes.carregado || notificacoes.ocupado}
            onValueChange={(valor) => { setMensagemNotificacao(''); void definirNotificacoes(valor); }}
            trackColor={{ false: '#414B45', true: '#8DD9A6' }}
            thumbColor="#F4F7F4"
            accessibilityLabel="Lembrete diário às 7h"
          />
        </View>
        <Text style={styles.descricao}>Receba uma notificação às 7h nos dias em que houver refeições planejadas.</Text>
        {!notificacoes.disponivel ? <Text style={styles.descricao}>Os lembretes locais estão disponíveis na versão Android.</Text> : null}
        {notificacoes.ocupado ? <Text style={styles.descricao} accessibilityLiveRegion="polite">Sincronizando lembretes...</Text> : null}
        {notificacoes.erro ? <Text style={[styles.mensagem, styles.mensagemErro]} accessibilityLiveRegion="polite">{notificacoes.erro}</Text> : null}
        {notificacoes.permissaoNegada ? <Pressable accessibilityRole="button" style={styles.botaoSecundario} onPress={() => { void Linking.openSettings().catch(() => setMensagemNotificacao('Abra as configurações do Android para permitir notificações deste aplicativo.')); }}><Text style={styles.mensagemSucesso}>Abrir configurações do Android</Text></Pressable> : null}
        {notificacoes.disponivel && notificacoes.erro ? <Pressable accessibilityRole="button" disabled={notificacoes.ocupado} style={styles.botaoSecundario} onPress={() => void sincronizarNotificacoes()}><Text style={styles.mensagemSucesso}>Verificar lembretes novamente</Text></Pressable> : null}
        {notificacoes.preferencia && !notificacoes.habilitado ? <Pressable accessibilityRole="button" disabled={notificacoes.ocupado} style={styles.botaoSecundario} onPress={() => void definirNotificacoes(false)}><Text style={styles.mensagemSucesso}>Desativar lembretes</Text></Pressable> : null}
        {__DEV__ && notificacoes.disponivel ? <Pressable accessibilityRole="button" disabled={!notificacoes.habilitado || notificacoes.ocupado} style={styles.botaoSecundario} onPress={() => { void agendarNotificacaoDeTeste().then(() => setMensagemNotificacao('Teste solicitado. Confira o status acima e aguarde cerca de 10 segundos.')) }}><Text style={styles.mensagemSucesso}>Testar notificação em 10 segundos (desenvolvimento)</Text></Pressable> : null}
        {mensagemNotificacao ? <Text style={styles.descricao} accessibilityLiveRegion="polite">{mensagemNotificacao}</Text> : null}
      </View>

      <View style={styles.cartaoSobre}>
        <Text style={styles.rotuloSobre}>SOBRE</Text>
        <Text style={styles.tituloCartao}>Sobre o aplicativo</Text>
        <Text style={styles.nomeAplicativo}>Planeja sua Fome</Text>
        <Text style={styles.descricaoSobre}>
          Um jeito simples de organizar suas compras e planejar suas refeições.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  linhaNotificacao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginVertical: 8 },
  rotuloNotificacao: { color: '#F4F7F4', fontSize: 15, flex: 1 },
  botaoSecundario: { minHeight: 44, justifyContent: 'center', paddingVertical: 10 },
  container: {
    flex: 1,
    backgroundColor: '#161616',
  },
  conteudo: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  cabecalho: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  titulo: {
    color: '#F4F7F4',
    fontSize: 34,
    fontWeight: '700',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  cabecaAvatar: {
    borderColor: '#F4F7F4',
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    width: 16,
  },
  corpoAvatar: {
    borderColor: '#F4F7F4',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 2,
    borderBottomWidth: 0,
    height: 9,
    marginTop: 2,
    width: 24,
  },
  cartao: {
    backgroundColor: '#222222',
    borderColor: '#303030',
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  tituloCartao: {
    color: '#F4F7F4',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  descricao: {
    color: '#B5BDB8',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  campo: {
    backgroundColor: '#181818',
    borderColor: '#393939',
    borderRadius: 12,
    borderWidth: 1,
    color: '#F4F7F4',
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  botao: {
    alignItems: 'center',
    backgroundColor: '#8DD9A6',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
  },
  botaoPressionado: {
    backgroundColor: '#72C88F',
  },
  textoBotao: {
    color: '#17231B',
    fontSize: 16,
    fontWeight: '700',
  },
  mensagem: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  mensagemSucesso: {
    color: '#8DD9A6',
  },
  mensagemErro: {
    color: '#FF9B9B',
  },
  saudaContainer: {
    borderTopColor: '#414B45',
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 18,
  },
  rotuloSaudacao: {
    color: '#8DD9A6',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  saudacao: {
    color: '#F4F7F4',
    fontSize: 22,
    fontWeight: '700',
  },
  descricaoSaudacao: {
    color: '#B5BDB8',
    fontSize: 14,
    marginTop: 4,
  },
  cartaoSobre: {
    backgroundColor: '#222222',
    borderColor: '#303030',
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  rotuloSobre: {
    color: '#8DD9A6',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  nomeAplicativo: {
    color: '#8DD9A6',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  descricaoSobre: {
    color: '#B5BDB8',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
});
