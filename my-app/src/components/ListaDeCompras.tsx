import React, { Text, View } from 'react-native';

interface Categorias {
    categorias: string[]
}

class ItensCompras implements Categorias {
    categorias: string[] = ["pendentes", "comprados"]
    nomeItem: string
    quantidade: number

    constructor(categorias: string[], nomeItem: string, quantidade: number){
        this.categorias = categorias;
        this.nomeItem = nomeItem;
        this.quantidade = quantidade
    }

    mostrarCategoria(){
    if(categorias === "pendentes"){
        return categorias = "pendentes"
    }
    else if(this.categorias = "comprados"){

    }
    else {
        return ItensCompras;
    }
}
}


function ListaDeCompras(){
    return(
        <View>
            <Text>Lista De Compras</Text>
            <ul>
                <li><button>Todos</button></li>
                <li><button>Pendentes</button></li>
                <li><button>Comprados</button></li>
            </ul>
        </View>
    )
}


export default ListaDeCompras;