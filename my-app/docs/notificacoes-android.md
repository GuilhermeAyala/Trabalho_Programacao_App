# Lembretes locais no Android

O aplicativo agenda uma notificação por data salva, às 7h no fuso local, somente quando a preferência e a permissão do Android permitem. Rascunhos e dias vazios não são elegíveis. Hoje, às 7h ou depois, não é criado um lembrete atrasado.

## Configuração e armazenamento

- `expo-notifications` é instalado pela versão compatível com o Expo SDK 58. O plugin configura a cor e o canal `planejamento-diario`; notificações remotas não são utilizadas.
- `POST_NOTIFICATIONS` é a permissão de notificação do Android 13+. Ela só é solicitada ao ativar o switch no Perfil. A biblioteca declara `RECEIVE_BOOT_COMPLETED` para restaurar agendamentos após reinicializações do aparelho.
- Não são solicitadas permissões de alarmes exatos, tarefas de fundo, tokens push, localização ou acesso à bateria. O disparo usa `delivery: 'bestEffort'`.
- A preferência fica em `@planeja-sua-fome:lembretes-7h:v1`. Os identificadores são determinísticos (`planejamento-diario:YYYY-MM-DD`) e ficam no agendador nativo. A reconciliação consulta os agendamentos reais, sem manter outra cópia dos planos.
- As gravações e exclusões confirmadas publicam um evento após o commit. O observador reconcilia lembretes em uma fila independente; uma falha nativa não desfaz a gravação. O aviso de falha permite tentar novamente.
- A inicialização e o retorno ao primeiro plano reconciliam os agendamentos sem pedir permissão. Ao mudar o fuso, a próxima reconciliação recalcula os horários locais e substitui os agendamentos antigos. O contador semanal continua usando exclusivamente os planos persistidos e semanas de domingo a sábado.

## Compilação e limites

Recompile o aplicativo Android após instalar o módulo e alterar o plugin. Em uma máquina com Android SDK e aparelho/emulador configurados, use `npx expo run:android` para uma compilação de desenvolvimento; não é necessário configurar Firebase ou serviços push. Não use a execução web para testar entrega nativa.

O Android pode atrasar notificações por Doze, economia de bateria, restrições do fabricante ou configurações do usuário. O horário configurado é 7h, sem garantia de entrega exata. Um aplicativo forçado a parar pode não receber notificações até ser aberto novamente. Alterações de fuso feitas com o aplicativo fechado são corrigidas quando ele voltar ao primeiro plano; não há serviço próprio rodando continuamente para observar mudanças de fuso. O sistema controla a restauração após reinicializar o aparelho.

Referência: [Expo Notifications SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/).

## Roteiro de teste em aparelho

1. Em uma instalação nova, abra o aplicativo: não deve aparecer solicitação de permissão. No Perfil, ative **Lembrete diário às 7h** e conceda a permissão.
2. Salve um plano futuro, com uma ou três refeições. Deve existir um único lembrete para essa data às 7h. Uma seleção sem salvar não deve gerar agendamento.
3. Em desenvolvimento (`__DEV__`), o Perfil mostra **Testar notificação em 10 segundos**. Salve ao menos um plano e use o botão. Ele agenda uma notificação de teste separada, identificada como `planejamento-diario:teste`, sem alterar planos ou o contador. Testes repetidos substituem esse único teste pendente.
4. Aguarde a notificação real no aparelho e toque nela. Confirme a data e as refeições salvas. Repita com o aplicativo aberto, em segundo plano e fechado; uma mesma resposta não deve abrir a tela duas vezes. Se houver rascunho, confirme ou cancele o descarte.
5. Edite e salve o plano: não deve surgir um segundo lembrete diário. Exclua e cancele a confirmação: plano e lembrete devem continuar. Confirme a exclusão: apenas os lembretes desse plano devem ser cancelados. Um toque em uma notificação já entregue de um plano excluído deve mostrar o aviso de plano ausente.
6. Desative o switch: todos os lembretes deste recurso, incluindo o teste, devem ser cancelados; planos e contador devem permanecer. Reative: somente datas elegíveis devem voltar, sem duplicatas.
7. Feche e abra o aplicativo. Confira preferência, planos, contador e ausência de duplicatas. Reinicie também o aparelho para verificar a restauração nativa no dispositivo escolhido.
8. Negue a permissão, inclusive removendo-a nas configurações do Android. O switch não deve indicar lembretes ativos; deve haver orientação para abrir as configurações. Reiniciar o aplicativo não deve solicitar permissão novamente.
9. Verifique datas passadas, hoje antes das 7h, exatamente às 7h e depois das 7h, além de mudança de mês/ano e de fuso. Não deve haver lembretes atrasados para hoje ou dias anteriores.
10. Em testes automatizados com o adaptador nativo simulado, provoque falhas de agendamento/cancelamento e confirme que os planos e o progresso são preservados. No aparelho, confirme o aviso se ocorrer uma falha nativa real.

## Validação disponível neste ambiente

Os testes Node simulam AsyncStorage e as APIs de notificação; não comprovam entrega no Android. Não foi encontrado `adb` no PATH nem no caminho padrão do Android SDK, portanto a entrega, o toque com inicialização a frio e o comportamento após reiniciar o aparelho precisam ser verificados em um dispositivo.

```sh
npx tsc --noEmit
npm run lint
node --test tests/planejamento.test.cjs tests/notificacoes.test.cjs
```
