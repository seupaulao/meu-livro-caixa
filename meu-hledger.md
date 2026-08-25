**Objetivo**

Criar um plano de implementação para uma aplicação react native que
tem como objetivo simular a aplicação hledger.

**Abas**

3 Abas distintas:

Aba 1 - Lançamento - ver 'Regras Lançamento' 
Aba 2 - Listagem
Aba 3 - Relatórios
          - Tela 1 : Balanço Patrimonial
          - Tela 2 : Balancete
          - Tela 3 : DRE		  

**Regras Lançamento**

- No lançamento solicitar a data do dia no formato 'DD/MM/AAAA'
- No lançamento deve ser solicitado a 'descrição da operação'
- No lançamento deve ser solicitado a Conta, no formato 'TipoDeConta:NomeDaConta', ex: 'Passivo:Fornecedor'
- No lançamento deve ser solicitado o valor no formato R$ 99999999999,99
  - Atenção deve ser observada no registro do valor
    - deve ser obrigatório iniciar o valor pela cifra, ex: R$, U$, BRL, USD, etc.	
- o formato de entrada deve diferenciar débito e crédito.

Se a entrada for a débito

Entradas Possíveis:

Conta: - D Ativo:Caixa [Enter]
ou
Conta: - Ativo:Caixa [Enter]

Se a entrada for a crédito

Entradas Possíveis:

Conta: - C Ativo:ContaCorrente [Enter]
ou
Conta: - a Ativo:ContaCorrente [Enter]

Após a entrada da CONTA, deve-se aceitar o VALOR


O Lançamento é cancelado a qualquer momento se no ato de entrada da Conta ou do Valor o usuário
digitar '.' e depois teclar 'ENTER'

Para o lançamento ser efetivado, deve-se obedecer o método de partidas dobradas, onde:
o somatórios dos débitos deve ser igual ao somatório dos créditos .
Caso a operação acima não seja efetivada, deve-se solicitar a conta e o valor até que 
a operação de validação seja satisfeita e validada com êxito.

Após um lançamento efetivado, ele deve ser disponibilizado imediatamente na Aba Listagem.

**Regra Aba Listagem**

- A Listagem é apenas leitura
- A listagem deve ter o dia do lançamento e a descrição do lançamento
- Alinhado a direita 3 botões : Detalhar, Excluir.

Ao clicar em Detalhar, uma modal abre mostrando o lançamento feito naquele dia e sua descrição 
e seus valores e contas, tudo isso só leitura. um botão 'Fechar Janela' no rodapé - centralizado.

Ao clicar em Excluir, uma mensagem de confirmação deve aparecer : 'Deseja realmente excluir? (s/n)'
Caso positivo o item de lançamento é excluído do banco.

**Regra Aba Relatórios**
O usuário deve navegar entre 3 relatórios mensais : Balancete, Balanço Patrimonial, DRE.
Devem ser lançados conforme as contas, obedecendo a lógica do hledger.
Vai abrir uma modal solicitando o mês do relatório, 
O relatório será gerado no mês solicitado numa modal, com um botão Fechar ao rodapé centralizado.

Criar uma lista de Tasks, no arquivo 'tasks.md' da implementação, onde cada vez que um item for implementado
deve ser 'checado' na lista de 'tasks.md'.

Criar a persistência de dados usando banco de dados local, de preferência sqlite ou similar
se houver.