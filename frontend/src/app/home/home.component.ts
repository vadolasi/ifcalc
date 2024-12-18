import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite'
import { ClienteSuap } from 'suap-sdk';
import { BackendService } from '../backend.service';
import { LoadingService } from '../loading.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  form: FormGroup;
  suapForm = new FormGroup({
    matricula: new FormControl("", [Validators.required]),
    senha: new FormControl("", [Validators.required]),
    anoLetivo: new FormControl("", [Validators.required]),
  });
  suap = new ClienteSuap({ usarApenasApi: true });
  situacoes: {
    disciplina: number;
    situacao: string;
    media: number | null;
    recuperacao: number | null;
  }[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private backend: BackendService,
    private loadingService: LoadingService
  ) {
    this.form = this.formBuilder.group({
      disciplinas: this.formBuilder.array([
        this.formBuilder.group({
          nome: this.formBuilder.control(""),
          tipo: this.formBuilder.control("semestral", [Validators.required, Validators.pattern(/semestral|anual/)]),
          notas: this.formBuilder.array([
            this.formBuilder.group({
              nota: this.formBuilder.control(null),
              tipo: this.formBuilder.control("manual", [Validators.required, Validators.pattern(/automatico|manual|calculado/)]),
            }),
          ]),
        }),
      ]),
    });
  }

  ngOnInit() {
    initFlowbite()
  }

  getSituacao(index: number) {
    return this.situacoes.find((situacao) => situacao.disciplina === index) || null;
  }

  get disciplinas() {
    return this.form.get("disciplinas") as FormArray;
  }

  getDisciplina(index: number) {
    return this.disciplinas.at(index) as FormGroup;
  }

  getNotas(indexDisciplina: number) {
    return this.getDisciplina(indexDisciplina).get("notas") as FormArray;
  }

  addDisciplina() {
    this.disciplinas.push(
      this.formBuilder.group({
        nome: this.formBuilder.control(""),
        tipo: this.formBuilder.control("semestral", [Validators.required, Validators.pattern(/semestral|anual/)]),
        notas: this.formBuilder.array([
          this.formBuilder.group({
            tipo: this.formBuilder.control("manual", [Validators.required, Validators.pattern(/automatico|manual|calculado/)]),
            nota: this.formBuilder.control("", [Validators.required, Validators.min(0), Validators.max(100)]),
          }),
        ]),
      })
    );
  }

  removeDisciplina(index: number) {
    this.disciplinas.removeAt(index);
  }

  addNota(disciplinaIndex: number) {
    const notas = this.getNotas(disciplinaIndex);
    notas.push(
      this.formBuilder.group({
        nome: this.formBuilder.control(""),
        nota: this.formBuilder.control(null),
      })
    );
  }

  removeNota(disciplinaIndex: number, index: number) {
    this.getNotas(disciplinaIndex).removeAt(index);
  }

  calcularNotas() {
    this.situacoes = [];
    for (const [index, disciplina] of this.disciplinas.controls.entries()) {
      const { tipo, notas: preNotas } = disciplina.value as { tipo: string; notas: { nota: number; tipo: string }[] };
      const notas = preNotas.map(({ nota }) => nota);

      if (tipo === "semestral") {
        const situacao = this.suap.calcularNotasSemestral(...notas as [number])
        this.situacoes.push({ situacao: situacao.situação, disciplina: index, media: situacao.média || null, recuperacao: situacao.nota_prova_final || null });
      } else {
        const situacao = this.suap.calcularNotasAnual(...notas as [number, number]);
        this.situacoes.push({ situacao: situacao.situação, disciplina: index, media: situacao.média || null, recuperacao: situacao.nota_prova_final || null });
      }
    }
  }

  async importar() {
    this.loadingService.loadingOn();
    this.situacoes = [];
    this.disciplinas.clear();

    const { data } = await this.backend.app.api.notas.post({
      matricula: this.suapForm.get("matricula")?.value!,
      senha: this.suapForm.get("senha")?.value!,
      anoLetivo: parseInt(this.suapForm.get("anoLetivo")?.value!),
    })

    for (const { disciplina, segundo_semestre, quantidade_avaliacoes, nota_etapa_1: { nota: nota1 }, nota_etapa_2: { nota: nota2 }, nota_etapa_3: { nota: nota3 }, nota_etapa_4: { nota: nota4 } } of data!) {
      let notas: any[] = [];

      if (quantidade_avaliacoes === 4) {
        notas = [
          this.formBuilder.group({
            nota: this.formBuilder.control(nota1),
            tipo: this.formBuilder.control("manual", [Validators.required, Validators.pattern(/automatico|manual|calculado/)]),
          }),
          this.formBuilder.group({
            nota: this.formBuilder.control(nota2),
            tipo: this.formBuilder.control("manual", [Validators.required, Validators.pattern(/automatico|manual|calculado/)]),
          }),
          this.formBuilder.group({
            nota: this.formBuilder.control(nota3),
            tipo: this.formBuilder.control("manual", [Validators.required, Validators.pattern(/automatico|manual|calculado/)]),
          }),
          this.formBuilder.group({
            nota: this.formBuilder.control(nota4),
            tipo: this.formBuilder.control("manual", [Validators.required, Validators.pattern(/automatico|manual|calculado/)]),
          }),
        ]
      } else {
        if (segundo_semestre) {
          notas = [
            this.formBuilder.group({
              nota: this.formBuilder.control(nota3),
              tipo: this.formBuilder.control("manual", [Validators.required, Validators.pattern(/automatico|manual|calculado/)]),
            }),
            this.formBuilder.group({
              nota: this.formBuilder.control(nota4),
              tipo: this.formBuilder.control("manual", [Validators.required, Validators.pattern(/automatico|manual|calculado/)]),
            }),
          ]
        } else {
          notas = [
            this.formBuilder.group({
              nota: this.formBuilder.control(nota1),
              tipo: this.formBuilder.control("manual", [Validators.required, Validators.pattern(/automatico|manual|calculado/)]),
            }),
            this.formBuilder.group({
              nota: this.formBuilder.control(nota2),
              tipo: this.formBuilder.control("manual", [Validators.required, Validators.pattern(/automatico|manual|calculado/)]),
            }),
          ]
        }
      }

      const disciplinaControl = this.formBuilder.group({
        nome: this.formBuilder.control(disciplina),
        tipo: this.formBuilder.control(quantidade_avaliacoes === 2 ? "semestral" : "anual", [Validators.required, Validators.pattern(/semestral|anual/)]),
        notas: this.formBuilder.array(notas),
      });

      this.disciplinas.push(disciplinaControl);
    }
    this.loadingService.loadingOff();
  }
}
