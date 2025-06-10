from typing import List

class Ajandek:
    
    ajandek_db = 0
    
    def __init__(self, nev:str, suly:float, min_eletkor:int,tipus:str) -> None:
        self.nev = nev
        self.suly = suly
        self.min_eletkor = min_eletkor
        self.tipus = tipus
        Ajandek.ajandek_db += 1 
    
    def __str__(self) -> str:
        print("----------")
        return f"\nAjandek neve: {self.nev},\nsulya: {self.suly} kg,\n{self.min_eletkor} eves kortol,\ntipusa: {self.tipus}"
    
    @classmethod
    def get_ajandek_db(cls) -> int:
        return cls.ajandek_db
    
class Gyerek:
    
    jo_viselkedes = True    
    
    def __init__(self, nev:str, eletkor:int, viselkedes:bool) -> None:
        self.nev = nev
        self.eletkor = eletkor
        self.viselkedes = viselkedes
        self.ajandekok = []   
        
    def __str__(self) -> str:
        print("----------")
        return f"\nGyerek neve: {self.nev},\neletkora: {self.eletkor} eves,\n{'Jo' if self.viselkedes else 'Rossz'} viselkedesu"  
    
    def megerdemli(self)-> bool:
        if self.viselkedes == Gyerek.jo_viselkedes:
            # print(f"{self.nev} jo gyerek, megerdemli az ajandekot.")
            return True     
        return False
    
    def ajandekot_kap(self, ajandek:List[Ajandek]) -> None:
        if self.eletkor >= ajandek.min_eletkor and self.megerdemli():
            self.ajandekok.append(ajandek)
            # print(f"{self.nev} ajandekot kapott: {ajandek.nev}")
        else:
            print(f"{self.nev} nem kap ajandekot: {ajandek.nev}")   
            
class Puttony:
    def __init__(self, max_suly=50.0) -> None:
        self.ajandekok = []
        self.max_suly = max_suly
        
    def add_ajandek(self, ajandek:List[Ajandek]) -> None:
        if not isinstance(ajandek, Ajandek):
            raise TypeError("Csak Ajandek objektumokat lehet hozzaadni.")
        try:            
                if sum(ajandek.suly for ajandek in self.ajandekok) + ajandek.suly > self.max_suly:
                    raise ValueError(f"{ajandek.nev}, ami {ajandek.suly}kg, tullepne a megengedett sulyt.")
                self.ajandekok.append(ajandek)
                print(f"{ajandek.nev} hozzaadva a puttonyhoz.")
            # else: 
            #     raise ValueError("Tullepted a megengedett sulyt.")
        except ValueError as e:
            print(e)
            
    def osszsuly(self)-> float:
        if self.ajandekok:       
            ossz_suly = sum(ajandek.suly for ajandek in self.ajandekok)
            return f"Az osszes ajandek sulya: {ossz_suly} kg"        
        
    def listazas(self) -> List[Ajandek]:
        if self.ajandekok:
            ossz_ajandek = [ajandek.nev for ajandek in self.ajandekok]
            return f"Ajandekok a puttonyban: {', '.join(ossz_ajandek)}"
        return "A puttony ures."       
    
class Mikulas:
    def __init__(self, nev:str, puttony:Puttony) -> None:
        self.nev = nev
        self.puttony = puttony
        
    def ajandekoz(self, gyerek:Gyerek, ajandek:Ajandek) -> None:
        if gyerek.megerdemli() and gyerek.eletkor >= ajandek.min_eletkor:
            gyerek.ajandekot_kap(ajandek)
            self.puttony.ajandekok.remove(ajandek)
            print(f"{gyerek.nev} ajandekot kapott: {ajandek.nev} a Mikulastol.")
        else:
            print(f"{gyerek.nev} nem kap ajandekot: {ajandek.nev}")     
            
            
    
if __name__ == "__main__":
    
    bicikli = Ajandek("Bicikli", 15.5, 6, "Jatek")
    print(bicikli)    
    kifesto = Ajandek("Kifesto", 1.5, 2, "Konyv")
    print(kifesto)    
    konzol = Ajandek("Konzol", 2.5, 10, "Jatek")
    print(konzol)
    csoki = Ajandek("Csoki", 0.5, 0, "Edesseg")
    print(csoki)
    sifelszereles = Ajandek("Sifelszereles", 18.5, 8, "Sifelszereles")
    print(sifelszereles)
    plussmaci = Ajandek("Plussmaci",10.0, 4, "Jatek")
    print(plussmaci)
    koszikla = Ajandek("Koszikla",75.0, 12, "Termeszet")
    print(koszikla)
    print()
    print(f"Ajandekok szama: {Ajandek.get_ajandek_db()}")
    print()
    anna = Gyerek("Anna", 8, True)
    print(anna)
    print(anna.megerdemli())
    laci = Gyerek("Laci", 13, True)
    print(laci)
    print(laci.megerdemli())
    krisztian = Gyerek("Krisztian", 37, False)
    print(krisztian)
    print(krisztian.megerdemli())
    mari = Gyerek("Mari", 4, True)      
    print(mari)
    print(mari.megerdemli())    
    
    puttony = Puttony()
    print()
    puttony.add_ajandek(bicikli)
    puttony.add_ajandek(kifesto)    
    puttony.add_ajandek(konzol)
    puttony.add_ajandek(csoki)
    puttony.add_ajandek(sifelszereles)
    puttony.add_ajandek(plussmaci)
    puttony.add_ajandek(koszikla)  
    print()
    # mari.ajandekot_kap(bicikli)
    # anna.ajandekot_kap(bicikli)
    # krisztian.ajandekot_kap(sifelszereles)
    print()
    print(puttony.osszsuly())
    print()
    print(puttony.listazas())
    print()
    mikulas = Mikulas("Mikulás", puttony)
    mikulas.ajandekoz(mari, bicikli)
    mikulas.ajandekoz(anna, kifesto)
    mikulas.ajandekoz(krisztian, sifelszereles)
    mikulas.ajandekoz(laci, konzol)
    
    
    
    