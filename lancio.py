$luoghi = @(
  "Piazza dei Martiri", "Piazza Duomo", "Piazza delle Erbe", "Piazza Santa Maria dei Battuti",
  "Cattedrale di San Martino", "Chiesa di Santo Stefano", "Chiesa di San Pietro",
  "Chiesa di Santa Maria dei Battuti", "Battistero del Duomo", "Chiesa di Santa Maria di Loreto",
  "Palazzo dei Rettori", "Palazzo Rosso", "Porta Dojona", "Porta Rugo", "Porta Dante", "Torrione",
  "Ponte degli Alpini", "Palazzo Fulcis", "Palazzo dei Giuristi", "Museo dell'Emigrazione Veneta",
  "Teatro Comunale Dino Buzzati", "Stazione FS Belluno", "Borgo Piave", "Palazzo Nossadani",
  "Loggia dei Ghibellini", "Fontana della Motta"
)
foreach ($l in $luoghi) { python estrai_foto.py "Belluno $l" 3 }