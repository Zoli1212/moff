from typing import List


class Ajandek:
    def __init__(self, nev: str, suly: float, tipus: str, ajanlott_eletkor: int):
        self.nev = nev
        self.suly = suly
        self.tipus = tipus
        self.ajanlott_eletkor = ajanlott_eletkor

    def __str__(self):
        return f"Ajándék neve: {self.nev}, típusa: {self.tipus}, súlya: {self.suly} kg, ajánlott minimális életkor: {self.ajanlott_eletkor} év"


class Gyerek:
    def __init__(self, nev: str, eletkor: int, viselkedes: str):
        self.nev = nev
        self.eletkor = eletkor
        self.viselkedes = viselkedes

    def megerdemli(self):
        viselkedes_lower = self.viselkedes.lower()
        if viselkedes_lower == "jó":
            return True
        elif viselkedes_lower == "rossz":
            return False
        else:
            print(
                f"Figyelmeztetés: Ismeretlen viselkedés '{self.viselkedes}'. Feltételezve, hogy nem jó."
            )
            return False


class Puttony:
    def __init__(self, max_sulykapacitas=100.00):
        self.max_sulykapacitas = max_sulykapacitas
        self.ajandekok: List[Ajandek] = []

    def osszsuly(self):
        return sum(ajandek.suly for ajandek in self.ajandekok)

    def add_ajandek(self, ajandek: Ajandek):
        osszsuly = self.osszsuly()
        if osszsuly + ajandek.suly <= self.max_sulykapacitas:
            self.ajandekok.append(ajandek)
        else:
            raise ValueError(
                f"A hozzáadni kívánt ajándékkal meghaladná a puttony maximum kapacitását.\nJelenlegi kapacitás: {osszsuly}, Limit: {self.max_sulykapacitas}"
            )

    def listazas(self):
        return [str(ajandek) for ajandek in self.ajandekok]


class Mikulas:
    def __init__(self, nev: str):
        self.nev = nev
        self.puttony = Puttony(max_sulykapacitas=100.00)

    def add_ajandek_puttonyhoz(self, ajandek: Ajandek):
        self.puttony.add_ajandek(ajandek)

    def ajandekoz(self, gyerek: Gyerek):
        if gyerek.megerdemli():
            megfelelo_ajandekok = [
                ajandek
                for ajandek in self.puttony.ajandekok
                if gyerek.eletkor >= ajandek.ajanlott_eletkor
            ]
            if not megfelelo_ajandekok:
                return (
                    f"{gyerek.nev}.\nNincs számodra megfelelő ajándék a puttonyomban!\n"
                )
            valasztas = min(megfelelo_ajandekok, key=lambda a: a.suly)
            self.puttony.ajandekok.remove(valasztas)
            return f"{gyerek.nev} ajándéka:\n {valasztas}\n"
        else:
            return f"{gyerek.nev}\nTe virgácsot kapsz!\n"


if __name__ == "__main__":

    mikulas = Mikulas("Mikulas")
    ajandek1 = Ajandek("plüssmaci", 0.1, "játék", 1)
    ajandek2 = Ajandek("csoki", 0.2, "étel", 2)
    ajandek3 = Ajandek("ifjúsági regény", 0.7, "könyv", 16)
    ajandek4 = Ajandek("tolltartó", 0.2, "játék", 13)
    ajandek5 = Ajandek("csoki", 0.2, "étel", 2)
    ajandek6 = Ajandek("mesekönyv", 0.5, "könyv", 10)

    mikulas.add_ajandek_puttonyhoz(ajandek1)
    mikulas.add_ajandek_puttonyhoz(ajandek2)
    mikulas.add_ajandek_puttonyhoz(ajandek3)
    mikulas.add_ajandek_puttonyhoz(ajandek4)
    mikulas.add_ajandek_puttonyhoz(ajandek5)
    mikulas.add_ajandek_puttonyhoz(ajandek6)

    gyerek1 = Gyerek("Jancsi", 14, "Jó")
    gyerek2 = Gyerek("Anikó", 2, "Jó")
    gyerek3 = Gyerek("Enikő", 1, "Jó")
    gyerek4 = Gyerek("Zénó", 3, "Rossz")
    gyerek5 = Gyerek("Gáspár", 1, "Jó")
    gyerek6 = Gyerek("Luca", 12, "Rossz")

    print(mikulas.ajandekoz(gyerek1))
    print(mikulas.ajandekoz(gyerek2))
    print(mikulas.ajandekoz(gyerek3))
    print(mikulas.ajandekoz(gyerek4))
    print(mikulas.ajandekoz(gyerek5))
    print(mikulas.ajandekoz(gyerek6))
