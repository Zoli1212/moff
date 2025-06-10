from rich import print as r_print


class Ajandek:
    def __init__(self, nev: str, suly: float, min_eletkor: int, tipus: str):
        self.nev = nev
        self.suly = suly
        self.min_eletkor = min_eletkor
        self.tipus = tipus

    def __repr__(self):
        return f"{self.nev}, súly = {self.suly} kg, minimum életkor = {self.min_eletkor} év, típus = {self.tipus}"


class Gyerek:
    def __init__(self, nev: str, eletkor: int, viselkedes: str):
        self.nev = nev
        self.eletkor = eletkor
        self.viselkedes = viselkedes

    def megerdemli(self):
        return self.viselkedes == "jó"


class Puttony:
    def __init__(self):
        self.max_suly = 6
        self.ajandekok = []

    def add_ajandek(self, ajandek: str):
        if self.osszsuly() + ajandek.suly > self.max_suly:
            raise ValueError("Nem fér több ajándék a puttonyba!")
        self.ajandekok.append(ajandek)

    def osszsuly(self):
        return sum(ajandek.suly for ajandek in self.ajandekok)

    def listazas(self):
        for ajandek in self.ajandekok:
            r_print(ajandek)


class Mikulas:
    def __init__(self, nev: str, puttony: str):
        self.nev = nev
        self.puttony = puttony

    def ajandekoz(self, gyerek):
        if not gyerek.megerdemli():
            return f"{gyerek.nev} virgácsot kapott!"

        for ajandek in self.puttony.ajandekok:
            if gyerek.eletkor >= ajandek.min_eletkor:
                self.puttony.ajandekok.remove(ajandek)
                return f"{gyerek.nev} ezt az ajándékot kapta: {ajandek}"

        return f"{gyerek.nev} jó volt, de nem maradt neki ajándék."


def main():

    puttony = Puttony()
    mikulas = Mikulas("Télapó", puttony)

    ajandek1 = Ajandek("kisautó", 2.5, 4, "játék")
    ajandek2 = Ajandek("cukorka", 0.5, 5, "édesség")
    ajandek3 = Ajandek("mesekönyv", 1, 7, "könyv")
    ajandek4 = Ajandek("baba", 2, 3, "játék")

    puttony.add_ajandek(ajandek1)
    puttony.add_ajandek(ajandek2)
    puttony.add_ajandek(ajandek3)
    puttony.add_ajandek(ajandek4)

    gyerekek = [
        Gyerek("Marci", 10, "jó"),
        Gyerek("Dezsőke", 6, "jó"),
        Gyerek("Julcsi", 8, "rossz"),
    ]

    for gyerek in gyerekek:
        r_print(mikulas.ajandekoz(gyerek))

    r_print(f"\nPuttonyban maradt játékok: {len(puttony.ajandekok)} db")
    puttony.listazas()


if __name__ == "__main__":
    main()
